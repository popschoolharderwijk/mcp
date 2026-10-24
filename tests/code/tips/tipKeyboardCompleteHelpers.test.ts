import { describe, expect, it } from 'bun:test';
import type { AgendaFullscreenKeyEvent } from '../../../src/lib/agenda/agendaFullscreenKeyboard';
import { resolveAgendaTipIdFromKey } from '../../../src/lib/tips/tipKeyboardCompleteHelpers';

const plainKey = (key: string): AgendaFullscreenKeyEvent => ({
	key,
	ctrlKey: false,
	metaKey: false,
	altKey: false,
	target: null,
});

describe('resolveAgendaTipIdFromKey', () => {
	it('returns null off the agenda route', () => {
		expect(resolveAgendaTipIdFromKey('/students', plainKey('f'))).toBeNull();
		expect(resolveAgendaTipIdFromKey('/students', plainKey('ArrowLeft'))).toBeNull();
		expect(resolveAgendaTipIdFromKey('/', plainKey('F'))).toBeNull();
	});

	it('maps F and arrow keys on /agenda', () => {
		expect(resolveAgendaTipIdFromKey('/agenda', plainKey('f'))).toBe('agenda-fullscreen');
		expect(resolveAgendaTipIdFromKey('/agenda', plainKey('F'))).toBe('agenda-fullscreen');
		expect(resolveAgendaTipIdFromKey('/agenda', plainKey('ArrowLeft'))).toBe('agenda-nav-keyboard');
		expect(resolveAgendaTipIdFromKey('/agenda', plainKey('ArrowRight'))).toBe('agenda-nav-keyboard');
		expect(resolveAgendaTipIdFromKey('/agenda', plainKey('ArrowUp'))).toBe('agenda-nav-keyboard');
	});

	it('ignores unrelated keys on /agenda', () => {
		expect(resolveAgendaTipIdFromKey('/agenda', plainKey('a'))).toBeNull();
		expect(resolveAgendaTipIdFromKey('/agenda', plainKey('ArrowDown'))).toBeNull();
	});
});
