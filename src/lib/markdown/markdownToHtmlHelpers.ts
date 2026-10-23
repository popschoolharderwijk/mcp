/**
 * Markdown → HTML for transactional email bodies.
 * Same subset as announcements: paragraphs, line breaks, headings #–###,
 * unordered lists, **bold**, *italic*, `code`, [text](url), ![alt](url).
 */
import { parseMarkdownBlocks } from '@/lib/markdown/markdownBlockFormatters';

const URL_PATTERN = /^https?:\/\/[^\s)]+$/i;

const INLINE_PATTERN =
	/!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;

export function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeHref(url: string): string | null {
	if (!URL_PATTERN.test(url)) return null;
	return url;
}

function inlineMarkdownToHtml(text: string): string {
	let html = '';
	let cursor = 0;
	INLINE_PATTERN.lastIndex = 0;
	let match = INLINE_PATTERN.exec(text);
	while (match !== null) {
		if (match.index > cursor) {
			html += escapeHtml(text.slice(cursor, match.index));
		}
		if (match[2] !== undefined) {
			const href = safeHref(match[2]);
			if (href) {
				html += `<img src="${escapeHtml(href)}" alt="${escapeHtml(match[1] ?? '')}" />`;
			} else {
				html += escapeHtml(match[0]);
			}
		} else if (match[4] !== undefined) {
			const href = safeHref(match[4]);
			if (href) {
				html += `<a href="${escapeHtml(href)}">${escapeHtml(match[3] ?? '')}</a>`;
			} else {
				html += escapeHtml(match[3] ?? '');
			}
		} else if (match[5] !== undefined) {
			html += `<strong>${escapeHtml(match[5])}</strong>`;
		} else if (match[6] !== undefined) {
			html += `<em>${escapeHtml(match[6])}</em>`;
		} else if (match[7] !== undefined) {
			html += `<code>${escapeHtml(match[7])}</code>`;
		}
		cursor = match.index + match[0].length;
		match = INLINE_PATTERN.exec(text);
	}
	if (cursor < text.length) {
		html += escapeHtml(text.slice(cursor));
	}
	return html;
}

function paragraphToHtml(text: string): string {
	const withBreaks = text
		.split('\n')
		.map((line) => inlineMarkdownToHtml(line))
		.join('<br>\n');
	return `<p>${withBreaks}</p>`;
}

/** Convert announcement-subset markdown to HTML suitable for Resend. */
export function markdownToHtml(source: string): string {
	const blocks = parseMarkdownBlocks(source);
	const parts: string[] = [];
	for (const block of blocks) {
		if (block.kind === 'heading') {
			const level = Math.min(3, Math.max(1, block.level));
			parts.push(`<h${level}>${inlineMarkdownToHtml(block.text)}</h${level}>`);
			continue;
		}
		if (block.kind === 'list') {
			const items = block.items.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join('');
			parts.push(`<ul>${items}</ul>`);
			continue;
		}
		parts.push(paragraphToHtml(block.text));
	}
	return parts.join('\n');
}
