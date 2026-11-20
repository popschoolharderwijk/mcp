import { UUID_RE } from '../_shared/http.ts';

export function parseSwitchProfileBody(body: unknown): { ok: true; profileId: string } | { ok: false; error: string } {
	if (body == null || typeof body !== 'object') {
		return { ok: false, error: 'Invalid JSON' };
	}
	const profileId = (body as { profile_id?: unknown }).profile_id;
	if (typeof profileId !== 'string' || !UUID_RE.test(profileId)) {
		return { ok: false, error: 'profile_id is verplicht' };
	}
	return { ok: true, profileId };
}

export function buildActiveProfileAppMetadata(
	existingAppMetadata: Record<string, unknown> | undefined,
	profileId: string,
): Record<string, unknown> {
	return {
		...(existingAppMetadata ?? {}),
		active_profile_id: profileId,
	};
}

export type SwitchMembershipGate = { ok: true } | { ok: false; status: 403 | 500; error: string };

/** Map membership lookup to allow / forbid / server error. */
export function resolveSwitchMembershipGate(
	membership: { profile_id: string } | null | undefined,
	membershipError: unknown,
): SwitchMembershipGate {
	if (membershipError) {
		return { ok: false, status: 500, error: 'Kon lidmaatschap niet controleren' };
	}
	if (!membership) {
		return { ok: false, status: 403, error: 'Geen toegang tot dit profiel' };
	}
	return { ok: true };
}

export type SwitchProfileUpdateGate = { ok: true } | { ok: false; status: 500; error: string };

/** Map auth admin updateUserById result to success or server error. */
export function resolveSwitchProfileUpdateGate(
	updatedUser: { id: string } | null | undefined,
	updateError: unknown,
): SwitchProfileUpdateGate {
	if (updateError || !updatedUser) {
		return { ok: false, status: 500, error: 'Kon actief profiel niet instellen' };
	}
	return { ok: true };
}
