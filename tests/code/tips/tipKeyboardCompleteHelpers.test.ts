import { describe, expect, it } from 'bun:test';
import type { AgendaFullscreenKeyEvent } from '../../../src/lib/agenda/agendaFullscreenKeyboard';
import { resolveAgendaTipCompleteOnFromKey } from '../../../src/lib/tips/tipKeyboardCompleteHelpers';

const plainKey = (key: string): AgendaFullscreenKeyEvent => ({
	key,
	ctrlKey: false,
	metaKey: false,
	altKey: false,
	target: null,
});

describe('resolveAgendaTipCompleteOnFromKey', () => {
	it('returns null off the agenda route', () => {
		expect(resolveAgendaTipCompleteOnFromKey('/students', plainKey('f'))).toBeNull();
		expect(resolveAgendaTipCompleteOnFromKey('/students', plainKey('ArrowLeft'))).toBeNull();
		expect(resolveAgendaTipCompleteOnFromKey('/', plainKey('F'))).toBeNull();
	});

	it('maps F and arrow keys on /agenda', () => {
		expect(resolveAgendaTipCompleteOnFromKey('/agenda', plainKey('f'))).toBe('agenda-fullscreen-hotkey');
		expect(resolveAgendaTipCompleteOnFromKey('/agenda', plainKey('F'))).toBe('agenda-fullscreen-hotkey');
		expect(resolveAgendaTipCompleteOnFromKey('/agenda', plainKey('ArrowLeft'))).toBe('agenda-nav-keys');
		expect(resolveAgendaTipCompleteOnFromKey('/agenda', plainKey('ArrowRight'))).toBe('agenda-nav-keys');
		expect(resolveAgendaTipCompleteOnFromKey('/agenda', plainKey('ArrowUp'))).toBe('agenda-nav-keys');
	});

	it('ignores unrelated keys on /agenda', () => {
		expect(resolveAgendaTipCompleteOnFromKey('/agenda', plainKey('a'))).toBeNull();
		expect(resolveAgendaTipCompleteOnFromKey('/agenda', plainKey('ArrowDown'))).toBeNull();
	});
});
