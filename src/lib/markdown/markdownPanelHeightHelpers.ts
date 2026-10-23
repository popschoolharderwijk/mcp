export const MARKDOWN_PANEL_MIN_PX = 200;
export const MARKDOWN_PANEL_MAX_PX = 448; // 28rem

export function clampMarkdownPanelHeight(px: number): number {
	return Math.min(MARKDOWN_PANEL_MAX_PX, Math.max(MARKDOWN_PANEL_MIN_PX, px));
}

/** Shared pixel height for editor + preview: taller content wins, within min/max. */
export function resolveMatchedMarkdownPanelHeight(editorScrollHeight: number, previewScrollHeight: number): number {
	return clampMarkdownPanelHeight(Math.max(editorScrollHeight, previewScrollHeight));
}
