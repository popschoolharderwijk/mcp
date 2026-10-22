import type { AgreementRow, ProfileRow } from './types.ts';

export function resolveAgreementLoadFailure(
	agreement: AgreementRow | null | undefined,
	errorMessage: string | undefined,
): { status: number; error: string } | null {
	if (errorMessage || !agreement) {
		return { status: 404, error: 'Lesovereenkomst niet gevonden' };
	}
	return null;
}

export function resolveAgreementInactiveFailure(agreement: AgreementRow): { status: number; error: string } | null {
	if (!agreement.is_active) {
		return { status: 409, error: 'Lesovereenkomst is niet actief' };
	}
	return null;
}

export function resolveAgreementProfileFailure(
	profile: ProfileRow | null | undefined,
): { status: number; error: string } | null {
	if (!profile?.email) {
		return { status: 400, error: 'Geen e-mail bekend voor leerling' };
	}
	return null;
}

export function resolveAgreementPreProfileFailure(
	agreement: AgreementRow | null | undefined,
	errorMessage: string | undefined,
): { status: number; error: string } | null {
	const loadFailure = resolveAgreementLoadFailure(agreement, errorMessage);
	if (loadFailure) return loadFailure;
	return resolveAgreementInactiveFailure(agreement as AgreementRow);
}
