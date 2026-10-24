import { describe, expect, it } from 'bun:test';
import { isTypingTarget, shouldOpenCommandPaletteOnSlashKey } from '../../../src/lib/keyboard/keyboardHelpers';

describe('isTypingTarget', () => {
	it('returns false for null', () => {
		expect(isTypingTarget(null)).toBe(false);
	});

	it('returns true for form fields and contenteditable', () => {
		expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
		expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
		expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true);
		expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
	});

	it('returns false for ordinary elements', () => {
		expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false);
		expect(isTypingTarget({ tagName: 'DIV', isContentEditable: false })).toBe(false);
	});
});

describe('shouldOpenCommandPaletteOnSlashKey', () => {
	it('opens on plain slash', () => {
		expect(
			shouldOpenCommandPaletteOnSlashKey({
				key: '/',
				ctrlKey: false,
				metaKey: false,
				altKey: false,
				target: null,
			}),
		).toBe(true);
	});

	it('ignores other keys and modifier combinations', () => {
		expect(
			shouldOpenCommandPaletteOnSlashKey({
				key: 'k',
				ctrlKey: false,
				metaKey: false,
				altKey: false,
				target: null,
			}),
		).toBe(false);
		expect(
			shouldOpenCommandPaletteOnSlashKey({
				key: '/',
				ctrlKey: true,
				metaKey: false,
				altKey: false,
				target: null,
			}),
		).toBe(false);
		expect(
			shouldOpenCommandPaletteOnSlashKey({
				key: '/',
				ctrlKey: false,
				metaKey: true,
				altKey: false,
				target: null,
			}),
		).toBe(false);
		expect(
			shouldOpenCommandPaletteOnSlashKey({
				key: '/',
				ctrlKey: false,
				metaKey: false,
				altKey: true,
				target: null,
			}),
		).toBe(false);
	});

	it('ignores slash while typing in a field', () => {
		expect(
			shouldOpenCommandPaletteOnSlashKey({
				key: '/',
				ctrlKey: false,
				metaKey: false,
				altKey: false,
				target: { tagName: 'INPUT' },
			}),
		).toBe(false);
	});
});
