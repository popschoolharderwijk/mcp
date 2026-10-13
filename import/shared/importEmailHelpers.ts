/** Shared Mongo import email allocation (teachers, students, future person importers). */

/** Placeholder when source email is missing; searchable via Mongo oid. */
function missingImportEmail(mongoOid: string): string {
	return `missing_${mongoOid}@example.com`;
}

/** Nth duplicate of an email: `duplicate_1_local@domain` (1-based index among duplicates). */
function buildDuplicateImportEmail(originalEmail: string, duplicateIndex: number): string {
	const at = originalEmail.lastIndexOf('@');
	const local = at >= 0 ? originalEmail.slice(0, at) : originalEmail;
	const domain = at >= 0 ? originalEmail.slice(at + 1) : 'example.com';
	return `duplicate_${duplicateIndex}_${local}@${domain}`;
}

export type ImportEmailDedupState = Map<string, number>;

export function createImportEmailDedupState(): ImportEmailDedupState {
	return new Map();
}

export type AllocatedImportEmail = {
	email: string;
	/** Missing/duplicate rewrite warning; includes the concrete replacement address. */
	warning: string | null;
};

/**
 * First occurrence keeps the original email; later ones get `duplicate_N_…`.
 * Missing email → `missing_<mongoOid>@example.com`. Warnings always name the replacement.
 */
export function allocateImportEmail(
	state: ImportEmailDedupState,
	rawEmail: string | null,
	mongoOid: string,
): AllocatedImportEmail {
	if (rawEmail == null) {
		const email = missingImportEmail(mongoOid);
		return { email, warning: `Missing email; using "${email}"` };
	}

	const key = rawEmail.toLowerCase();
	const priorCount = state.get(key) ?? 0;
	state.set(key, priorCount + 1);

	if (priorCount === 0) {
		return { email: rawEmail, warning: null };
	}

	const allocated = buildDuplicateImportEmail(rawEmail, priorCount);
	return {
		email: allocated,
		warning: `Duplicate email "${rawEmail}"; using "${allocated}"`,
	};
}

/**
 * Keep the source email and mark it seen (for same name+email profile merges).
 * Does not emit `duplicate_N_…`.
 */
export function keepExistingImportEmail(state: ImportEmailDedupState, rawEmail: string): AllocatedImportEmail {
	const key = rawEmail.toLowerCase();
	state.set(key, Math.max(state.get(key) ?? 0, 1));
	return {
		email: rawEmail,
		warning: 'Same name and email as existing profile; sharing user id',
	};
}
