/**
 * Local Stripe CLI webhook forwarder: clears logs/stripe.log on start, mirrors
 * CLI output to the terminal and that file through the same filters.
 *
 * Optional flags (after `--`):
 *   --log-level debug|info|trace|warn|error   → forwarded to Stripe CLI (default: omit)
 *   --log-exclude ping-pong                   → drop websocket ping/pong lines (terminal + file)
 *   --log-terminal on|off                     → mirror CLI stdout+stderr to the terminal (default: on; file always)
 *
 * Log lines are normalized: Stripe `time=` / event timestamps stripped, logfmt
 * `msg="…"` unwrapped, then every line (including a one-time `log level: …`
 * header) gets `[HH:mm:ss]` via `prefixConsoleLines`.
 *
 * Stripe CLI has no secret-redaction flag for `listen`. Known secret patterns
 * (`whsec_…` / `sk_…` / `rk_…`) are redacted in both terminal and log file.
 * Prefix + first few payload chars stay visible so you can tell secrets apart;
 * use `stripe listen --print-secret` when you need the raw signing secret.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prefixConsoleLines } from '../../src/lib/time/consoleClockHelpers';

const LOG_DIR = 'logs';
const LOG_FILE = path.join(LOG_DIR, 'stripe.log');
const FORWARD_TO = 'http://127.0.0.1:54421/functions/v1/stripe-webhook';

const LOG_LEVELS = new Set(['debug', 'info', 'trace', 'warn', 'error']);
const LOG_EXCLUDE_VALUES = new Set(['ping-pong']);
const LOG_TERMINAL_VALUES = new Set(['on', 'off']);

const LOGFMT_TIME_PREFIX = /^time="([^"]*)"\s*/;
const LOGFMT_LEVEL_PREFIX = /^level=(\S+)\s*/;
const LOGFMT_MSG_QUOTED = /^msg="((?:\\.|[^"\\])*)"\s*/;
const LOGFMT_MSG_BARE = /^msg=(\S+)\s*/;
const EVENT_TIMESTAMP_PREFIX = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})\s+/;

/** How many secret payload chars (after the typed prefix) stay visible before `**`. */
const SECRET_VISIBLE_PAYLOAD_CHARS = 4;

/** Stripe CLI secret-like tokens; keep typed prefix + a short hint, mask the rest. */
const STRIPE_SECRET_PATTERNS: ReadonlyArray<{ pattern: RegExp; prefixLength: number }> = [
	{ pattern: /whsec_[A-Za-z0-9]+/g, prefixLength: 'whsec_'.length },
	{ pattern: /sk_(?:test|live)_[A-Za-z0-9]+/g, prefixLength: 'sk_test_'.length },
	{ pattern: /rk_(?:test|live)_[A-Za-z0-9]+/g, prefixLength: 'rk_test_'.length },
];

export function redactStripeSecretToken(token: string, prefixLength: number): string {
	const keep = prefixLength + SECRET_VISIBLE_PAYLOAD_CHARS;
	if (token.length <= keep) {
		return `${token}**`;
	}
	return `${token.slice(0, keep)}**`;
}

export function redactStripeCliSecrets(text: string): string {
	let out = text;
	for (const { pattern, prefixLength } of STRIPE_SECRET_PATTERNS) {
		out = out.replace(pattern, (match) => redactStripeSecretToken(match, prefixLength));
	}
	return out;
}

export function isWebsocketPingPongLine(line: string): boolean {
	return line.includes('Sending ping message') || line.includes('Received pong message');
}

export function extractStripeLogLevel(line: string): string | null {
	const withoutTime = line.replace(LOGFMT_TIME_PREFIX, '');
	const match = withoutTime.match(LOGFMT_LEVEL_PREFIX);
	return match?.[1] ?? null;
}

function unwrapLogfmtMsg(rest: string): string {
	const quoted = rest.match(LOGFMT_MSG_QUOTED);
	if (quoted) {
		const message = quoted[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		const remainder = rest.slice(quoted[0].length);
		return remainder.length > 0 ? `${message} ${remainder}` : message;
	}
	const bare = rest.match(LOGFMT_MSG_BARE);
	if (bare) {
		const remainder = rest.slice(bare[0].length);
		return remainder.length > 0 ? `${bare[1]} ${remainder}` : bare[1];
	}
	return rest;
}

/** Strip Stripe timestamps/level and unwrap logfmt `msg=`; clock prefix is applied later. */
export function formatStripeCliLogLine(line: string): string {
	if (line.length === 0) return '';

	const timeMatch = line.match(LOGFMT_TIME_PREFIX);
	if (timeMatch) {
		let rest = line.slice(timeMatch[0].length);
		rest = rest.replace(LOGFMT_LEVEL_PREFIX, '');
		return unwrapLogfmtMsg(rest);
	}

	const eventMatch = line.match(EVENT_TIMESTAMP_PREFIX);
	if (eventMatch) {
		return line.slice(eventMatch[0].length);
	}

	return line;
}

export type ScriptOptions = {
	stripeLogLevelArgs: string[];
	excludePingPong: boolean;
	/** When false, CLI stdout+stderr still go to the log file but not to the terminal. */
	logTerminal: boolean;
};

function configuredStripeLogLevel(options: ScriptOptions): string | null {
	const levelIndex = options.stripeLogLevelArgs.indexOf('--log-level');
	if (levelIndex < 0) return null;
	return options.stripeLogLevelArgs[levelIndex + 1] ?? null;
}

type FlagValueResult = { ok: true; value: string; nextIndex: number } | { ok: false; error: string };

export function readFlagValue(argv: readonly string[], i: number, flag: string): FlagValueResult {
	const arg = argv[i] ?? '';
	const eqPrefix = `${flag}=`;
	if (arg.startsWith(eqPrefix)) {
		const value = arg.slice(eqPrefix.length);
		if (!value) return { ok: false, error: `Missing value for ${flag}` };
		return { ok: true, value, nextIndex: i + 1 };
	}
	const value = argv[i + 1];
	if (!value || value.startsWith('-')) return { ok: false, error: `Missing value for ${flag}` };
	return { ok: true, value, nextIndex: i + 2 };
}

type ParseOptionsResult = { ok: true; options: ScriptOptions } | { ok: false; error: string };

type FlagConsumeResult =
	| { ok: true; nextIndex: number; apply: (options: ScriptOptions) => void }
	| { ok: false; error: string }
	| null;

function matchesFlag(arg: string, flag: string): boolean {
	return arg === flag || arg.startsWith(`${flag}=`);
}

function consumeLogLevelFlag(argv: readonly string[], i: number): FlagConsumeResult {
	const arg = argv[i] ?? '';
	if (!matchesFlag(arg, '--log-level')) return null;
	const parsed = readFlagValue(argv, i, '--log-level');
	if (!parsed.ok) return parsed;
	if (!LOG_LEVELS.has(parsed.value)) {
		return {
			ok: false,
			error: `Invalid --log-level "${parsed.value}" (debug | info | trace | warn | error)`,
		};
	}
	const level = parsed.value;
	return {
		ok: true,
		nextIndex: parsed.nextIndex,
		apply: (options) => {
			options.stripeLogLevelArgs.push('--log-level', level);
		},
	};
}

function consumeLogExcludeFlag(argv: readonly string[], i: number): FlagConsumeResult {
	const arg = argv[i] ?? '';
	if (!matchesFlag(arg, '--log-exclude')) return null;
	const parsed = readFlagValue(argv, i, '--log-exclude');
	if (!parsed.ok) return parsed;
	if (!LOG_EXCLUDE_VALUES.has(parsed.value)) {
		return { ok: false, error: `Unknown --log-exclude value "${parsed.value}" (supported: ping-pong)` };
	}
	return {
		ok: true,
		nextIndex: parsed.nextIndex,
		apply: (options) => {
			options.excludePingPong = true;
		},
	};
}

function consumeLogTerminalFlag(argv: readonly string[], i: number): FlagConsumeResult {
	const arg = argv[i] ?? '';
	if (!matchesFlag(arg, '--log-terminal')) return null;
	const parsed = readFlagValue(argv, i, '--log-terminal');
	if (!parsed.ok) return parsed;
	if (!LOG_TERMINAL_VALUES.has(parsed.value)) {
		return { ok: false, error: `Invalid --log-terminal "${parsed.value}" (on | off)` };
	}
	const logTerminal = parsed.value === 'on';
	return {
		ok: true,
		nextIndex: parsed.nextIndex,
		apply: (options) => {
			options.logTerminal = logTerminal;
		},
	};
}

export function parseScriptOptions(argv: readonly string[]): ParseOptionsResult {
	const options: ScriptOptions = { stripeLogLevelArgs: [], excludePingPong: false, logTerminal: true };

	let i = 0;
	while (i < argv.length) {
		const consumed =
			consumeLogLevelFlag(argv, i) ?? consumeLogExcludeFlag(argv, i) ?? consumeLogTerminalFlag(argv, i);
		if (!consumed) return { ok: false, error: `Unknown argument: ${argv[i]}` };
		if (!consumed.ok) return consumed;
		consumed.apply(options);
		i = consumed.nextIndex;
	}

	return { ok: true, options };
}

export function shouldEmitFilteredLine(line: string, excludePingPong: boolean): boolean {
	if (excludePingPong && isWebsocketPingPongLine(line)) return false;
	return true;
}

function runCli(): void {
	const parsed = parseScriptOptions(process.argv.slice(2));
	if (!parsed.ok) {
		console.error(parsed.error);
		process.exit(1);
	}
	const options = parsed.options;

	mkdirSync(LOG_DIR, { recursive: true });
	writeFileSync(LOG_FILE, '');

	const logStream = createWriteStream(LOG_FILE, { flags: 'a' });
	const terminalOut = options.logTerminal ? process.stdout : null;
	const terminalErr = options.logTerminal ? process.stderr : null;

	type StreamMirror = {
		terminal: NodeJS.WriteStream | null;
		buf: string;
	};

	let levelHeaderEmitted = false;

	function writeText(text: string, terminal: NodeJS.WriteStream | null): void {
		terminal?.write(text);
		logStream.write(text);
	}

	function emitStamped(message: string, terminal: NodeJS.WriteStream | null, trailingNewline: boolean): void {
		const stamped = prefixConsoleLines(message);
		writeText(trailingNewline ? `${stamped}\n` : stamped, terminal);
	}

	function emitLevelHeaderOnce(level: string | null, terminal: NodeJS.WriteStream | null): void {
		if (levelHeaderEmitted || !level) return;
		levelHeaderEmitted = true;
		emitStamped(`log level: ${level}`, terminal, true);
	}

	emitLevelHeaderOnce(configuredStripeLogLevel(options), terminalOut);

	function emitLine(line: string, terminal: NodeJS.WriteStream | null, trailingNewline: boolean): void {
		if (!shouldEmitFilteredLine(line, options.excludePingPong)) return;
		emitLevelHeaderOnce(extractStripeLogLevel(line), terminal);
		const formatted = formatStripeCliLogLine(line);
		const redacted = redactStripeCliSecrets(formatted);
		emitStamped(redacted, terminal, trailingNewline);
	}

	function onChunk(mirror: StreamMirror, chunk: Buffer): void {
		mirror.buf += chunk.toString('utf8');
		const lines = mirror.buf.split('\n');
		mirror.buf = lines.pop() ?? '';
		for (const line of lines) {
			emitLine(line, mirror.terminal, true);
		}
	}

	function flushMirror(mirror: StreamMirror): void {
		if (mirror.buf.length === 0) return;
		emitLine(mirror.buf, mirror.terminal, false);
		mirror.buf = '';
	}

	// Stripe CLI splits output across streams (e.g. `-->` / `<--` events often on
	// stdout, debug/`Ready!` on stderr); --log-terminal off mutes both.
	const stdoutMirror: StreamMirror = { terminal: terminalOut, buf: '' };
	const stderrMirror: StreamMirror = { terminal: terminalErr, buf: '' };

	const stripeArgs = ['listen', '--all-snapshot', '--forward-to', FORWARD_TO, ...options.stripeLogLevelArgs];
	const stripeCli = Bun.which('stripe');
	if (!stripeCli) {
		console.error('stripe CLI not found on PATH');
		process.exit(1);
	}

	const child = spawn(stripeCli, stripeArgs, {
		stdio: ['inherit', 'pipe', 'pipe'],
	});

	child.stdout?.on('data', (chunk: Buffer) => onChunk(stdoutMirror, chunk));
	child.stderr?.on('data', (chunk: Buffer) => onChunk(stderrMirror, chunk));

	function shutdown(signal: NodeJS.Signals): void {
		child.kill(signal);
	}

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));

	function finishStreams(): void {
		flushMirror(stdoutMirror);
		flushMirror(stderrMirror);
		logStream.end();
	}

	child.on('error', (err) => {
		console.error(err);
		finishStreams();
		process.exit(1);
	});

	child.on('exit', (code, signal) => {
		finishStreams();
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 1);
	});
}

if (import.meta.main) {
	runCli();
}
