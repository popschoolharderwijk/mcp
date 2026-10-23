import { describe, expect, it } from 'bun:test';
import { escapeHtml, markdownToHtml } from '../../../src/lib/markdown/markdownToHtmlHelpers';

describe('escapeHtml', () => {
	it('escapes angle brackets and ampersands', () => {
		expect(escapeHtml('<script>&</script>')).toBe('&lt;script&gt;&amp;&lt;/script&gt;');
	});
});

describe('markdownToHtml', () => {
	it('renders paragraphs and bold', () => {
		expect(markdownToHtml('Hoi **naam**')).toBe('<p>Hoi <strong>naam</strong></p>');
	});

	it('renders unordered lists', () => {
		expect(markdownToHtml('- **A:** 1\n- **B:** 2')).toBe(
			'<ul><li><strong>A:</strong> 1</li><li><strong>B:</strong> 2</li></ul>',
		);
	});

	it('preserves template placeholders', () => {
		expect(markdownToHtml('Hoi {{leerling_naam}}')).toBe('<p>Hoi {{leerling_naam}}</p>');
	});

	it('turns a single newline within a paragraph into a br', () => {
		expect(markdownToHtml('Met muzikale groet,\nPopschool Harderwijk')).toBe(
			'<p>Met muzikale groet,<br>\nPopschool Harderwijk</p>',
		);
	});

	it('escapes raw HTML in source', () => {
		expect(markdownToHtml('Hi <b>x</b>')).toBe('<p>Hi &lt;b&gt;x&lt;/b&gt;</p>');
	});
});
