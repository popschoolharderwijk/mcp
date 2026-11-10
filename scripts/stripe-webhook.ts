/**
 * Local Stripe CLI webhook forwarder: clears logs/stripe.log on start, mirrors
 * CLI output to the terminal and that file through the same filters.
 *
 * Optional flags (after `--`):
 *   --log-level debug|info|trace|warn|error   → forwarded to Stripe CLI (default: omit)
 *   --log-exclude ping-pong                   → drop websocket ping/pong lines (terminal + file)
 *
 * Stripe CLI has no secret-redaction flag for `listen`. Known secret patterns
 * (`whsec_…` / `sk_…` / `rk_…`) are redacted in both terminal and log file.
 * Use `stripe listen --print-secret` when you need the raw signing secret.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const LOG_DIR = 'logs';
const LOG_FILE = path.join(LOG_DIR, 'stripe.log');
const FORWARD_TO = 'http://127.0.0.1:54421/functions/v1/stripe-webhook';

const LOG_LEVELS = new Set(['debug', 'info', 'trace', 'warn', 'error']);
const LOG_EXCLUDE_VALUES = new Set(['ping-pong']);

/** Stripe CLI secret-like tokens; replace match with a stable placeholder. */
const STRIPE_SECRET_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
	{ pattern: /whsec_[A-Za-z0-9]+/g, replacement: 'whsec_**' },
	{ pattern: /sk_(?:test|live)_[A-Za-z0-9]+/g, replacement: 'sk_**' },
	{ pattern: /rk_(?:test|live)_[A-Za-z0-9]+/g, replacement: 'rk_**' },
];

export function redactStripeCliSecrets(text: string): string {
	let out = text;
	for (const { pattern, replacement } of STRIPE_SECRET_PATTERNS) {
		out = out.replace(pattern, replacement);
	}
	return out;
}

export function isWebsocketPingPongLine(line: string): boolean {
	return line.includes('Sending ping message') || line.includes('Received pong message');
}

export type ScriptOptions = {
	stripeLogLevelArgs: string[];
	excludePingPong: boolean;
};

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

export function parseScriptOptions(argv: readonly string[]): ParseOptionsResult {
	const options: ScriptOptions = { stripeLogLevelArgs: [], excludePingPong: false };

	let i = 0;
	while (i < argv.length) {
		const consumed = consumeLogLevelFlag(argv, i) ?? consumeLogExcludeFlag(argv, i);
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

	type StreamMirror = {
		terminal: NodeJS.WriteStream;
		buf: string;
	};

	function emitLine(line: string, terminal: NodeJS.WriteStream, trailingNewline: boolean): void {
		if (!shouldEmitFilteredLine(line, options.excludePingPong)) return;
		const redacted = redactStripeCliSecrets(line);
		const text = trailingNewline ? `${redacted}\n` : redacted;
		terminal.write(text);
		logStream.write(text);
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

	const stdoutMirror: StreamMirror = { terminal: process.stdout, buf: '' };
	const stderrMirror: StreamMirror = { terminal: process.stderr, buf: '' };

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
