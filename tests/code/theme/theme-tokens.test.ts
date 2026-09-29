import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRIMARY_HEX } from '../../../src/lib/color/brand-hex';

const THEME_TOKENS_PATH = join(import.meta.dir, '../../../src/styles/theme-tokens.css');

/** HSL channel triple → #rrggbb (rounded; matches CSS --primary 24.6 95% 53.1%) */
function hslChannelsToHex(h: number, sPercent: number, lPercent: number): string {
	const s = sPercent / 100;
	const l = lPercent / 100;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color);
	};
	const toHex = (n: number) => n.toString(16).padStart(2, '0');
	return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function readCssBlock(source: string, selector: ':root' | '.dark'): string {
	const marker = selector === ':root' ? ':root {' : '.dark {';
	const start = source.indexOf(marker);
	expect(start).toBeGreaterThan(-1);
	let depth = 0;
	let i = start + marker.length - 1;
	for (; i < source.length; i++) {
		if (source[i] === '{') depth++;
		if (source[i] === '}') {
			depth--;
			if (depth === 0) {
				return source.slice(start, i + 1);
			}
		}
	}
	throw new Error(`Unclosed block for ${selector}`);
}

function parseCustomProperties(block: string): Map<string, string> {
	const map = new Map<string, string>();
	const re = /--([a-z0-9-]+):\s*([^;]+);/g;
	let match = re.exec(block);
	while (match) {
		map.set(match[1], match[2].trim());
		match = re.exec(block);
	}
	return map;
}

function isHslChannelLiteral(value: string): boolean {
	return /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(value.trim());
}

const PARITY_EXCLUDED_TOKEN_NAMES = new Set([
	'radius',
	'agenda-lesson',
	'agenda-manual',
	'agenda-lesson-foreground',
	'agenda-manual-foreground',
	'agenda-lesson-border',
	'agenda-manual-border',
	'agenda-group-border',
]);

describe('theme-tokens.css', () => {
	const css = readFileSync(THEME_TOKENS_PATH, 'utf8');
	const rootBlock = readCssBlock(css, ':root');
	const darkBlock = readCssBlock(css, '.dark');
	const rootTokens = parseCustomProperties(rootBlock);
	const darkTokens = parseCustomProperties(darkBlock);

	it('maps --primary to PRIMARY_HEX in light and dark', () => {
		const lightPrimary = rootTokens.get('primary');
		const darkPrimary = darkTokens.get('primary');
		expect(lightPrimary).toBe('24.6 95% 53.1%');
		expect(darkPrimary).toBe(lightPrimary);
		expect(hslChannelsToHex(24.6, 95, 53.1)).toBe(PRIMARY_HEX);
	});

	it('requires a .dark counterpart for each HSL literal in :root (scoped exclusions)', () => {
		const missingInDark: string[] = [];
		for (const [name, value] of rootTokens) {
			if (PARITY_EXCLUDED_TOKEN_NAMES.has(name)) {
				continue;
			}
			if (!isHslChannelLiteral(value)) {
				continue;
			}
			if (!darkTokens.has(name)) {
				missingInDark.push(name);
			}
		}
		expect(missingInDark).toEqual([]);
	});

	it('defines agenda group literals for light and dark parity', () => {
		expect(rootTokens.get('agenda-group')).toBe('239 84% 67%');
		expect(darkTokens.get('agenda-group')).toBe('239 84% 74%');
		expect(rootTokens.get('agenda-group-foreground')).toBe('0 0% 100%');
		expect(darkTokens.get('agenda-group-foreground')).toBe('0 0% 100%');
	});

	it('declares agenda border tokens with srgb color-mix in :root', () => {
		expect(rootTokens.get('agenda-lesson-border')).toBe('color-mix(in srgb, hsl(var(--agenda-lesson)) 75%, black)');
	});
});
