import { describe, expect, it } from 'bun:test';
import {
	resolveAgendaNavigateKey,
	shouldHandleAgendaFullscreenKey,
} from '../../../src/lib/agenda/agendaFullscreenKeyboard';
import type { KeyboardTarget } from '../../../src/lib/keyboard/keyboardHelpers';

function keyEvent(
	overrides: Partial<{
		key: string;
		ctrlKey: boolean;
		metaKey: boolean;
		altKey: boolean;
		target: KeyboardTarget | null;
	}> = {},
) {
	return {
		key: 'f',
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		target: null,
		...overrides,
	};
}

describe('shouldHandleAgendaFullscreenKey', () => {
	it('handles plain f and F', () => {
		expect(shouldHandleAgendaFullscreenKey(keyEvent({ key: 'f' }))).toBe(true);
		expect(shouldHandleAgendaFullscreenKey(keyEvent({ key: 'F' }))).toBe(true);
	});

	it('ignores other keys and modifier combinations', () => {
		expect(shouldHandleAgendaFullscreenKey(keyEvent({ key: 'g' }))).toBe(false);
		expect(shouldHandleAgendaFullscreenKey(keyEvent({ ctrlKey: true }))).toBe(false);
		expect(shouldHandleAgendaFullscreenKey(keyEvent({ metaKey: true }))).toBe(false);
		expect(shouldHandleAgendaFullscreenKey(keyEvent({ altKey: true }))).toBe(false);
	});

	it('ignores key presses while typing in a field', () => {
		expect(shouldHandleAgendaFullscreenKey(keyEvent({ target: { tagName: 'INPUT' } }))).toBe(false);
	});
});

describe('resolveAgendaNavigateKey', () => {
	it('maps arrow keys to PREV, NEXT, and TODAY', () => {
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowLeft' }))).toBe('PREV');
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowRight' }))).toBe('NEXT');
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowUp' }))).toBe('TODAY');
	});

	it('ignores other keys, modifiers, and typing targets', () => {
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'f' }))).toBeNull();
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowDown' }))).toBeNull();
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowLeft', ctrlKey: true }))).toBeNull();
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowRight', metaKey: true }))).toBeNull();
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowUp', altKey: true }))).toBeNull();
		expect(resolveAgendaNavigateKey(keyEvent({ key: 'ArrowLeft', target: { tagName: 'INPUT' } }))).toBeNull();
	});
});
