import { describe, expect, it } from 'bun:test';
import {
	isWebsocketPingPongLine,
	parseScriptOptions,
	readFlagValue,
	redactStripeCliSecrets,
	shouldEmitFilteredLine,
} from '../../../../scripts/stripe/webhook.ts';

describe('readFlagValue', () => {
	it('reads space-separated flag values', () => {
		expect(readFlagValue(['--log-level', 'debug'], 0, '--log-level')).toEqual({
			ok: true,
			value: 'debug',
			nextIndex: 2,
		});
	});

	it('reads equals-separated flag values', () => {
		expect(readFlagValue(['--log-exclude=ping-pong'], 0, '--log-exclude')).toEqual({
			ok: true,
			value: 'ping-pong',
			nextIndex: 1,
		});
	});

	it('rejects missing values for both flag forms', () => {
		expect(readFlagValue(['--log-level'], 0, '--log-level')).toEqual({
			ok: false,
			error: 'Missing value for --log-level',
		});
		expect(readFlagValue(['--log-level', '--log-exclude'], 0, '--log-level')).toEqual({
			ok: false,
			error: 'Missing value for --log-level',
		});
		expect(readFlagValue(['--log-level='], 0, '--log-level')).toEqual({
			ok: false,
			error: 'Missing value for --log-level',
		});
	});
});

describe('parseScriptOptions', () => {
	it('defaults to no Stripe log-level, no excludes, and stderr on', () => {
		expect(parseScriptOptions([])).toEqual({
			ok: true,
			options: { stripeLogLevelArgs: [], excludePingPong: false, logStderr: true },
		});
	});

	it('forwards a valid log-level to Stripe CLI args', () => {
		expect(parseScriptOptions(['--log-level', 'debug'])).toEqual({
			ok: true,
			options: { stripeLogLevelArgs: ['--log-level', 'debug'], excludePingPong: false, logStderr: true },
		});
	});

	it('enables ping-pong exclusion', () => {
		expect(parseScriptOptions(['--log-exclude=ping-pong'])).toEqual({
			ok: true,
			options: { stripeLogLevelArgs: [], excludePingPong: true, logStderr: true },
		});
	});

	it('accepts log-level, log-exclude, and log-stderr together', () => {
		expect(
			parseScriptOptions(['--log-level=trace', '--log-exclude', 'ping-pong', '--log-stderr=off']),
		).toEqual({
			ok: true,
			options: {
				stripeLogLevelArgs: ['--log-level', 'trace'],
				excludePingPong: true,
				logStderr: false,
			},
		});
	});

	it('rejects invalid log-level values', () => {
		expect(parseScriptOptions(['--log-level', 'verbose'])).toEqual({
			ok: false,
			error: 'Invalid --log-level "verbose" (debug | info | trace | warn | error)',
		});
	});

	it('rejects unknown log-exclude values', () => {
		expect(parseScriptOptions(['--log-exclude', 'deadlines'])).toEqual({
			ok: false,
			error: 'Unknown --log-exclude value "deadlines" (supported: ping-pong)',
		});
	});

	it('rejects invalid log-stderr values', () => {
		expect(parseScriptOptions(['--log-stderr', 'quiet'])).toEqual({
			ok: false,
			error: 'Invalid --log-stderr "quiet" (on | off)',
		});
	});

	it('rejects unknown arguments', () => {
		expect(parseScriptOptions(['--forward-to', 'http://example'])).toEqual({
			ok: false,
			error: 'Unknown argument: --forward-to',
		});
	});
});

describe('output filters', () => {
	it('redacts Stripe secrets but keeps a short prefix hint', () => {
		expect(redactStripeCliSecrets('secret is whsec_abc123xyz and sk_test_abcdefgh and rk_live_ijklmnop')).toBe(
			'secret is whsec_abc1** and sk_test_abcd** and rk_live_ijkl**',
		);
	});

	it('appends ** when the secret payload is shorter than the hint window', () => {
		expect(redactStripeCliSecrets('whsec_ab sk_test_xy rk_live_z')).toBe('whsec_ab** sk_test_xy** rk_live_z**');
	});

	it('detects websocket ping and pong debug lines', () => {
		expect(isWebsocketPingPongLine('msg="Sending ping message" prefix=websocket')).toBe(true);
		expect(isWebsocketPingPongLine('msg="Received pong message" prefix=websocket')).toBe(true);
		expect(isWebsocketPingPongLine('--> checkout.session.completed')).toBe(false);
	});

	it('drops ping-pong lines only when exclusion is enabled', () => {
		const ping = 'msg="Sending ping message"';
		expect(shouldEmitFilteredLine(ping, false)).toBe(true);
		expect(shouldEmitFilteredLine(ping, true)).toBe(false);
		expect(shouldEmitFilteredLine('Ready! whsec_abc', true)).toBe(true);
	});
});
