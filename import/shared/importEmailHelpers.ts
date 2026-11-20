/** Shared Mongo import email allocation (teachers, students, future person importers). */

/** Placeholder when source email is missing; searchable via Mongo oid. */
function missingImportEmail(mongoOid: string): string {
	return `missing_${mongoOid}@example.com`;
}

export type ImportEmailDedupState = Map<string, number>;

export function createImportEmailDedupState(): ImportEmailDedupState {
	return new Map();
}

export type AllocatedImportEmail = {
	/** Login email for owners; null for shared-login members. */
	email: string | null;
	/** First claimant of this email is owner; later different people are shared members. */
	kind: 'owner' | 'shared_member' | 'missing';
	/** Missing / shared-login warning; names the source or placeholder address. */
	warning: string | null;
};

/**
 * First occurrence keeps the original email as owner login.
 * Later occurrences → shared_member (null email); missing → `missing_<mongoOid>@example.com`.
 */
export function allocateImportEmail(
	state: ImportEmailDedupState,
	rawEmail: string | null,
	mongoOid: string,
): AllocatedImportEmail {
	if (rawEmail == null) {
		const email = missingImportEmail(mongoOid);
		return { email, kind: 'missing', warning: `Missing email; using "${email}"` };
	}

	const key = rawEmail.toLowerCase();
	const priorCount = state.get(key) ?? 0;
	state.set(key, priorCount + 1);

	if (priorCount === 0) {
		return { email: rawEmail, kind: 'owner', warning: null };
	}

	return {
		email: null,
		kind: 'shared_member',
		warning: `Shared login email "${rawEmail}"; attaching as member under existing login`,
	};
}

/**
 * Keep the source email and mark it seen (for same name+email profile merges).
 * Does not emit shared_member.
 */
export function keepExistingImportEmail(state: ImportEmailDedupState, rawEmail: string): AllocatedImportEmail {
	const key = rawEmail.toLowerCase();
	state.set(key, Math.max(state.get(key) ?? 0, 1));
	return {
		email: rawEmail,
		kind: 'owner',
		warning: 'Same name and email as existing profile; sharing user id',
	};
}
