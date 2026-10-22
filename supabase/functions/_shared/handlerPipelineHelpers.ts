export function resolvePipelineFailure<T extends { ok: boolean; response?: Response }>(
	steps: readonly T[],
): Response | null {
	for (const step of steps) {
		if (!step.ok && step.response) {
			return step.response;
		}
	}
	return null;
}
