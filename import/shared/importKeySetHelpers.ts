import type { ImportReport } from './reportHelpers';

/** Add source keys into an accumulating set. */
export function recordKeys(target: Set<string>, keys: string[]): void {
	for (const key of keys) {
		target.add(key);
	}
}

/** Copy sorted key sets onto the import report. */
export function assignSortedReportKeys(
	report: ImportReport,
	skippedKeySet: Set<string>,
	ignoredKeySet: Set<string>,
): void {
	report.skippedKeys = [...skippedKeySet].sort((a, b) => a.localeCompare(b));
	report.ignoredKeys = [...ignoredKeySet].sort((a, b) => a.localeCompare(b));
}
