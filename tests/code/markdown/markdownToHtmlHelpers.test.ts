import { describe, expect, it } from 'bun:test';
import { escapeHtml, markdownToHtml } from '../../../supabase/functions/_shared/markdownToHtmlHelpers';

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

	it('renders headings level 1 through 3', () => {
		expect(markdownToHtml('# One\n\n## Two\n\n### Three')).toBe('<h1>One</h1>\n<h2>Two</h2>\n<h3>Three</h3>');
	});

	it('renders italic, inline code, and safe http links and images', () => {
		expect(markdownToHtml('Hi *naam* and `code`')).toBe('<p>Hi <em>naam</em> and <code>code</code></p>');
		expect(markdownToHtml('[site](https://example.com)')).toBe('<p><a href="https://example.com">site</a></p>');
		expect(markdownToHtml('![logo](http://example.com/a.png)')).toBe(
			'<p><img src="http://example.com/a.png" alt="logo" /></p>',
		);
	});

	it('does not emit anchor or img tags for unsafe URLs', () => {
		expect(markdownToHtml('[x](javascript:void)')).toBe('<p>x</p>');
		expect(markdownToHtml('![y](javascript:x)')).toBe('<p>![y](javascript:x)</p>');
	});
});
