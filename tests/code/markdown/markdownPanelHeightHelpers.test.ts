import { describe, expect, it } from 'bun:test';
import {
	MARKDOWN_PANEL_MAX_PX,
	MARKDOWN_PANEL_MIN_PX,
	clampMarkdownPanelHeight,
	resolveMatchedMarkdownPanelHeight,
} from '../../../src/lib/markdown/markdownPanelHeightHelpers';

describe('clampMarkdownPanelHeight', () => {
	it('clamps below the minimum', () => {
		expect(clampMarkdownPanelHeight(50)).toBe(MARKDOWN_PANEL_MIN_PX);
	});

	it('clamps above the maximum', () => {
		expect(clampMarkdownPanelHeight(900)).toBe(MARKDOWN_PANEL_MAX_PX);
	});
});

describe('resolveMatchedMarkdownPanelHeight', () => {
	it('uses the taller panel within bounds', () => {
		expect(resolveMatchedMarkdownPanelHeight(220, 300)).toBe(300);
	});

	it('does not exceed the maximum when preview is very tall', () => {
		expect(resolveMatchedMarkdownPanelHeight(220, 900)).toBe(MARKDOWN_PANEL_MAX_PX);
	});
});
