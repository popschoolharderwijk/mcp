export type MarkdownBlock =
	| { kind: 'heading'; level: number; text: string }
	| { kind: 'list'; items: string[] }
	| { kind: 'paragraph'; text: string };

type MarkdownLineKind =
	| { kind: 'blank' }
	| { kind: 'heading'; level: number; text: string }
	| { kind: 'list'; text: string }
	| { kind: 'paragraph'; text: string };

function classifyMarkdownLine(line: string): MarkdownLineKind {
	if (line.trim() === '') {
		return { kind: 'blank' };
	}

	const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
	if (headingMatch) {
		return { kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] };
	}

	const listMatch = /^[-*]\s+(.+)$/.exec(line);
	if (listMatch) {
		return { kind: 'list', text: listMatch[1] };
	}

	return { kind: 'paragraph', text: line };
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
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
