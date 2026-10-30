import type { SignupRequestRowCore } from '../_shared/signupRequestRowTypes.ts';

export interface Body {
	request_id: string;
	/** Optional: enroll the student in this group instead of the one originally requested. */
	override_lesson_group_id?: string | null;
}

export type SignupRequestRow = SignupRequestRowCore & {
	lesson_group_id: string | null;
	sepa_iban: string | null;
	sepa_bic: string | null;
	sepa_account_holder: string | null;
};
