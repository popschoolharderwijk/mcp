export type ImportReport = {
	created: number;
	updated: number;
	failed: number;
	failures: Array<{ oid: string | null; reason: string }>;
	warnings: Array<{ oid: string | null; reason: string }>;
	/** Unexpected source keys (neither mapped nor intentionally ignored). */
	skippedKeys: string[];
	/** Known source keys that appeared and are intentionally not imported. */
	ignoredKeys: string[];
};

export function createEmptyReport(): ImportReport {
	return {
		created: 0,
		updated: 0,
		failed: 0,
		failures: [],
		warnings: [],
		skippedKeys: [],
		ignoredKeys: [],
	};
}

function formatKeyList(keys: string[]): string {
	return `[${keys.join(', ')}]`;
}

export function formatImportReport(report: ImportReport): string {
	const lines = [
		`created: ${report.created}`,
		`updated: ${report.updated}`,
		`failed: ${report.failed}`,
		`warnings: ${report.warnings.length}`,
		`skipped: ${formatKeyList(report.skippedKeys)}`,
		`ignored: ${formatKeyList(report.ignoredKeys)}`,
	];
	for (const failure of report.failures) {
		lines.push(`  - ${failure.oid ?? '(no oid)'}: ${failure.reason}`);
	}
	for (const warning of report.warnings) {
		lines.push(`  WARN ${warning.oid ?? '(no oid)'}: ${warning.reason}`);
	}
	return lines.join('\n');
}
