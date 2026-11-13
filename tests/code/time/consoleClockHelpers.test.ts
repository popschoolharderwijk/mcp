import { describe, expect, it } from 'bun:test';
import { formatConsoleClock, prefixConsoleLines } from '../../../src/lib/time/consoleClockHelpers';

describe('formatConsoleClock', () => {
	it('formats local wall clock as HH:mm:ss with zero padding', () => {
		expect(formatConsoleClock(new Date(2026, 9, 30, 8, 0, 1))).toBe('08:00:01');
	});
});

describe('prefixConsoleLines', () => {
	it('leaves blank lines unprefixed for visual spacing', () => {
		const now = new Date(2026, 9, 30, 8, 0, 1);
		expect(prefixConsoleLines('\n═══\n courses \n═══', now)).toBe(
			'\n[08:00:01] ═══\n[08:00:01]  courses \n[08:00:01] ═══',
		);
	});
});
