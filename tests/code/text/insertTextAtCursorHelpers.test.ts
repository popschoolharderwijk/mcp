import { describe, expect, it } from 'bun:test';
import {
	insertSnippetIntoTextarea,
	insertTextAtCursor,
} from '../../../src/lib/text/insertTextAtCursorHelpers';

describe('insertTextAtCursor', () => {
	it('inserts snippet at cursor position', () => {
		expect(insertTextAtCursor('hello world', 5, 5, ' beautiful')).toBe('hello beautiful world');
	});

	it('replaces the selected range', () => {
		expect(insertTextAtCursor('hello world', 6, 11, 'there')).toBe('hello there');
	});
});

describe('insertSnippetIntoTextarea', () => {
	it('appends when the textarea element is missing', () => {
		expect(insertSnippetIntoTextarea(null, 'Hi ', '{{naam}}')).toEqual({
			nextValue: 'Hi {{naam}}',
			caret: 11,
		});
	});
});
