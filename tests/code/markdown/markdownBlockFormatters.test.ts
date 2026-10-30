import { describe, expect, it } from 'bun:test';
import { parseMarkdownBlocks } from '../../../supabase/functions/_shared/markdownBlockParseHelpers';

describe('parseMarkdownBlocks', () => {
	it('parses a single paragraph', () => {
		expect(parseMarkdownBlocks('Hello world')).toEqual([{ kind: 'paragraph', text: 'Hello world' }]);
	});

	it('parses headings lists and paragraphs separated by blank lines', () => {
		expect(parseMarkdownBlocks('# Title\n\n- one\n- two\n\nBody text')).toEqual([
			{ kind: 'heading', level: 1, text: 'Title' },
			{ kind: 'list', items: ['one', 'two'] },
			{ kind: 'paragraph', text: 'Body text' },
		]);
	});

	it('normalizes windows line endings', () => {
		expect(parseMarkdownBlocks('Line one\r\nLine two')).toEqual([
			{ kind: 'paragraph', text: 'Line one\nLine two' },
		]);
	});

	it('parses asterisk list items', () => {
		expect(parseMarkdownBlocks('* alpha\n* beta')).toEqual([{ kind: 'list', items: ['alpha', 'beta'] }]);
	});

	it('classifies blank lines between blocks', () => {
		expect(parseMarkdownBlocks('## Title\n   \nBody')).toEqual([
			{ kind: 'heading', level: 2, text: 'Title' },
			{ kind: 'paragraph', text: 'Body' },
		]);
	});
});
