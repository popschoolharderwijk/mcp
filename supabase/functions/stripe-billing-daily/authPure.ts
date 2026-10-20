/** Constant-time comparison of the key header sent by the cron job. */
export function isValidCronSecret(provided: string | null, expected: string | undefined): boolean {
	if (!expected || !provided) return false;
	if (provided.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
	return diff === 0;
}
