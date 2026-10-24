// Markdown → HTML for Resend transactional email bodies (Deno edge).
// Subset matches announcement markdown in src/lib/markdown (paragraphs, lists, headings, inline).

type MarkdownBlock =
	| { kind: 'heading'; level: number; text: string }
	| { kind: 'list'; items: string[] }
	| { kind: 'paragraph'; text: string };

type MarkdownLineKind =
	| { kind: 'blank' }
	| { kind: 'heading'; level: number; text: string }
	| { kind: 'list'; text: string }
	| { kind: 'paragraph'; text: string };

function classifyMarkdownLine(line: string): MarkdownLineKind {
	if (line.trim() === '') return { kind: 'blank' };
	const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
	if (headingMatch) {
		return { kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] };
	}
	const listMatch = /^[-*]\s+(.+)$/.exec(line);
	if (listMatch) return { kind: 'list', text: listMatch[1] };
	return { kind: 'paragraph', text: line };
}

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
	const lines = source.replace(/\r\n/g, '\n').split('\n');
	const blocks: MarkdownBlock[] = [];
	let paragraph: string[] = [];
	let listItems: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length === 0) return;
		blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
		paragraph = [];
	};
	const flushList = () => {
		if (listItems.length === 0) return;
		blocks.push({ kind: 'list', items: [...listItems] });
		listItems = [];
	};

	for (const rawLine of lines) {
		const classified = classifyMarkdownLine(rawLine.trimEnd());
		if (classified.kind === 'blank') {
			flushParagraph();
			flushList();
			continue;
		}
		if (classified.kind === 'heading') {
			flushParagraph();
			flushList();
			blocks.push({ kind: 'heading', level: classified.level, text: classified.text });
			continue;
		}
		if (classified.kind === 'list') {
			flushParagraph();
			listItems.push(classified.text);
			continue;
		}
		flushList();
		paragraph.push(classified.text);
	}
	flushParagraph();
	flushList();
	return blocks;
}

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

function inlineImageToHtml(alt: string, url: string, raw: string): string {
	const href = safeHref(url);
	if (!href) return escapeHtml(raw);
	return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" />`;
}

function inlineLinkToHtml(label: string, url: string): string {
	const href = safeHref(url);
	if (!href) return escapeHtml(label);
	return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function inlineMatchToHtml(match: RegExpExecArray): string {
	if (match[2] !== undefined) return inlineImageToHtml(match[1] ?? '', match[2], match[0]);
	if (match[4] !== undefined) return inlineLinkToHtml(match[3] ?? '', match[4]);
	if (match[5] !== undefined) return `<strong>${escapeHtml(match[5])}</strong>`;
	if (match[6] !== undefined) return `<em>${escapeHtml(match[6])}</em>`;
	if (match[7] !== undefined) return `<code>${escapeHtml(match[7])}</code>`;
	return '';
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
		html += inlineMatchToHtml(match);
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
