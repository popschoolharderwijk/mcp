/** Insert `snippet` between selection bounds in a plain string. */
export function insertTextAtCursor(
	currentValue: string,
	selectionStart: number,
	selectionEnd: number,
	snippet: string,
): string {
	return currentValue.slice(0, selectionStart) + snippet + currentValue.slice(selectionEnd);
}

/**
 * Insert `snippet` at the textarea caret (or replace the selection).
 * Falls back to appending when the element is missing.
 */
export function insertSnippetIntoTextarea(
	el: HTMLTextAreaElement | null,
	currentValue: string,
	snippet: string,
): { nextValue: string; caret: number } {
	if (!el) {
		const nextValue = currentValue + snippet;
		return { nextValue, caret: nextValue.length };
	}
	const start = el.selectionStart ?? currentValue.length;
	const end = el.selectionEnd ?? currentValue.length;
	const nextValue = insertTextAtCursor(currentValue, start, end, snippet);
	return { nextValue, caret: start + snippet.length };
}
