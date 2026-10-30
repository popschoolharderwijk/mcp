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

/** Per-severity text for `out/log/{section}.{error|warning|info}.log`. */
export type ImportReportLogSections = {
	error: string | null;
	warning: string | null;
	info: string | null;
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

function formatIssueLine(prefix: 'ERROR' | 'WARN' | 'INFO', issue: ImportReportIssue): string {
	if (prefix === 'INFO' && issue.oid == null) {
		return `INFO: ${issue.reason}`;
	}
	return `${prefix} ${issue.oid ?? '(no oid)'}: ${issue.reason}`;
}

function formatIssueSection(prefix: 'ERROR' | 'WARN' | 'INFO', issues: ImportReportIssue[]): string | null {
	if (issues.length === 0) return null;
	return `${issues.map((issue) => formatIssueLine(prefix, issue)).join('\n')}\n`;
}

/** Split per-row failures, warnings, and infos into severity log bodies. */
export function formatImportReportIssueSections(report: ImportReport): ImportReportLogSections {
	return {
		error: formatIssueSection('ERROR', report.failures),
		warning: formatIssueSection('WARN', report.warnings),
		info: formatIssueSection('INFO', report.infos),
	};
}
