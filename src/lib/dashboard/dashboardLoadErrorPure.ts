export class DashboardLoadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DashboardLoadError';
	}
}

interface LabeledQueryError {
	label: string;
	error: { message: string } | null;
}

export function assertDashboardQueriesOk(results: LabeledQueryError[]): void {
	const failed = results.find((result) => result.error);
	if (failed?.error) {
		throw new DashboardLoadError(`${failed.label}: ${failed.error.message}`);
	}
}
