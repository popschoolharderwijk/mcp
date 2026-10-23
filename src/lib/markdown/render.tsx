import type { ReactNode } from 'react';
import { parseMarkdownBlocks } from '@/lib/markdown/markdownBlockFormatters';
import {
	getMarkdownHeadingClass,
	getMarkdownHeadingTag,
	parseMarkdownInline,
} from '@/lib/markdown/markdownInlineHelpers';

/**
 * Minimal, safe markdown renderer for announcements.
 * Supports: paragraphs, line breaks, **bold**, *italic*, `code`,
 * [text](url), ![alt](url), unordered lists (- or *), headings # to ###.
 *
 * Unknown HTML is never rendered — we parse plain text and build JSX,
 * so XSS via raw HTML is not possible.
 */

export function renderMarkdown(source: string): ReactNode {
	const blocks = parseMarkdownBlocks(source);
	let blockIndex = 0;

	const nodes = blocks.map((block) => {
		if (block.kind === 'heading') {
			const Tag = getMarkdownHeadingTag(block.level);
			const key = `h-${blockIndex++}`;
			return (
				<Tag key={key} className={`${getMarkdownHeadingClass(block.level)} mt-2`}>
					{parseMarkdownInline(block.text, `h${blockIndex}`)}
				</Tag>
			);
		}
		if (block.kind === 'list') {
			const key = `ul-${blockIndex++}`;
			return (
				<ul key={key} className="list-disc space-y-1 pl-6">
					{block.items.map((item) => (
						<li key={item}>{parseMarkdownInline(item, `li-${item}`)}</li>
					))}
				</ul>
			);
		}
		const key = `p-${blockIndex++}`;
		const lines = block.text.split('\n');
		return (
			<p key={key} className="leading-relaxed">
				{lines.map((line, lineIndex) => (
					<span key={`${key}-l-${lineIndex}`}>
						{lineIndex > 0 ? <br /> : null}
						{parseMarkdownInline(line, `${key}-l${lineIndex}`)}
					</span>
				))}
			</p>
		);
	});

	return <div className="space-y-3 text-sm">{nodes}</div>;
}
