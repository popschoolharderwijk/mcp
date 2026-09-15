import type { JSX, ReactNode } from 'react';

const URL_PATTERN = /^https?:\/\/[^\s)]+$/i;

const INLINE_PATTERN =
	/!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;

function safeMarkdownHref(url: string): string | null {
	if (!URL_PATTERN.test(url)) return null;
	return url;
}

interface InlineTokenMatch {
	imageAlt?: string;
	imageUrl?: string;
	linkText?: string;
	linkUrl?: string;
	bold?: string;
	italic?: string;
	code?: string;
}

function parseInlineToken(match: RegExpExecArray): InlineTokenMatch {
	if (match[2] !== undefined) return { imageAlt: match[1], imageUrl: match[2] };
	if (match[4] !== undefined) return { linkText: match[3], linkUrl: match[4] };
	if (match[5] !== undefined) return { bold: match[5] };
	if (match[6] !== undefined) return { italic: match[6] };
	return { code: match[7] };
}

function renderMarkdownImage(token: InlineTokenMatch, key: string): ReactNode {
	const href = safeMarkdownHref(token.imageUrl ?? '');
	if (!href) return null;
	return (
		<img
			key={key}
			src={href}
			alt={token.imageAlt ?? ''}
			className="my-2 max-w-full rounded-md border border-border"
			loading="lazy"
		/>
	);
}

function renderMarkdownLink(token: InlineTokenMatch, key: string): ReactNode {
	const href = safeMarkdownHref(token.linkUrl ?? '');
	if (!href) return token.linkText ?? '';
	return (
		<a
			key={key}
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="text-primary underline underline-offset-2 hover:no-underline"
		>
			{token.linkText}
		</a>
	);
}

function renderMarkdownCode(token: InlineTokenMatch, key: string): ReactNode {
	return (
		<code key={key} className="rounded bg-muted px-1 py-0.5 text-xs">
			{token.code}
		</code>
	);
}

function renderInlineToken(token: InlineTokenMatch, key: string): ReactNode {
	if (token.imageUrl !== undefined) return renderMarkdownImage(token, key);
	if (token.linkUrl !== undefined) return renderMarkdownLink(token, key);
	if (token.bold !== undefined) return <strong key={key}>{token.bold}</strong>;
	if (token.italic !== undefined) return <em key={key}>{token.italic}</em>;
	if (token.code !== undefined) return renderMarkdownCode(token, key);
	return null;
}

/** Inline parser: bold, italic, code, links, images. */
export function parseMarkdownInline(text: string, keyPrefix: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let cursor = 0;
	let counter = 0;

	let match = INLINE_PATTERN.exec(text);
	while (match !== null) {
		if (match.index > cursor) {
			nodes.push(text.slice(cursor, match.index));
		}
		const key = `${keyPrefix}-i-${counter++}`;
		const rendered = renderInlineToken(parseInlineToken(match), key);
		if (rendered !== null) nodes.push(rendered);
		cursor = match.index + match[0].length;
		match = INLINE_PATTERN.exec(text);
	}

	if (cursor < text.length) {
		nodes.push(text.slice(cursor));
	}
	return nodes;
}

export function getMarkdownHeadingTag(level: number): keyof JSX.IntrinsicElements {
	return `h${Math.min(level + 2, 6)}` as keyof JSX.IntrinsicElements;
}

export function getMarkdownHeadingClass(level: number): string {
	if (level === 1) return 'text-lg font-semibold';
	if (level === 2) return 'text-base font-semibold';
	return 'text-sm font-semibold';
}
