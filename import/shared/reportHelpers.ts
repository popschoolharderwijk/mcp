export type ImportReport = {
	created: number;
	updated: number;
	failed: number;
	failures: Array<{ oid: string | null; reason: string }>;
	warnings: Array<{ oid: string | null; reason: string }>;
};

export function createEmptyReport(): ImportReport {
	return { created: 0, updated: 0, failed: 0, failures: [], warnings: [] };
}

export function formatImportReport(report: ImportReport): string {
	const lines = [
		`created: ${report.created}`,
		`updated: ${report.updated}`,
		`failed: ${report.failed}`,
		`warnings: ${report.warnings.length}`,
	];
	for (const failure of report.failures) {
		lines.push(`  - ${failure.oid ?? '(no oid)'}: ${failure.reason}`);
	}
	for (const warning of report.warnings) {
		lines.push(`  WARN ${warning.oid ?? '(no oid)'}: ${warning.reason}`);
	}
	return lines.join('\n');
}
