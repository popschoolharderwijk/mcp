export type ImportReportIssue = { oid: string | null; reason: string };

export type ImportReport = {
	created: number;
	updated: number;
	failed: number;
	failures: ImportReportIssue[];
	warnings: ImportReportIssue[];
	infos: ImportReportIssue[];
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
		infos: [],
		skippedKeys: [],
		ignoredKeys: [],
	};
}

function formatKeyList(keys: string[]): string {
	return `[${keys.join(', ')}]`;
}

/** Console summary: counts and key lists only (no per-row issues). */
export function formatImportReportSummary(report: ImportReport): string {
	return [
		`created: ${report.created}`,
		`updated: ${report.updated}`,
		`failed: ${report.failed}`,
		`warnings: ${report.warnings.length}`,
		`infos: ${report.infos.length}`,
		`skipped: ${formatKeyList(report.skippedKeys)}`,
		`ignored: ${formatKeyList(report.ignoredKeys)}`,
	].join('\n');
}

/** Per-row failures, warnings, and infos for `import.log`. */
export function formatImportReportIssues(report: ImportReport, converterName?: string): string {
	const lines: string[] = [];
	if (converterName) {
		lines.push(`=== ${converterName} ===`);
	}
	for (const failure of report.failures) {
		lines.push(`ERROR ${failure.oid ?? '(no oid)'}: ${failure.reason}`);
	}
	for (const warning of report.warnings) {
		lines.push(`WARN ${warning.oid ?? '(no oid)'}: ${warning.reason}`);
	}
	for (const info of report.infos) {
		lines.push(info.oid == null ? `INFO: ${info.reason}` : `INFO ${info.oid}: ${info.reason}`);
	}
	if (report.failures.length === 0 && report.warnings.length === 0 && report.infos.length === 0) {
		lines.push('(no errors, warnings, or infos)');
	}
	return `${lines.join('\n')}\n`;
}
