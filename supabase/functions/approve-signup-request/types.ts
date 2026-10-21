export interface Body {
	request_id: string;
	/** Optional: enroll the student in this group instead of the one originally requested. */
	override_lesson_group_id?: string | null;
}

export interface SignupRequestRow {
	id: string;
	status: string;
	payment_method?: 'stripe' | 'manual';
	email: string;
	first_name: string;
	last_name: string;
	phone_number: string | null;
	date_of_birth: string | null;
	parent_name: string | null;
	parent_email: string | null;
	parent_phone_number: string | null;
	lesson_group_id: string | null;
	sepa_iban: string | null;
	sepa_bic: string | null;
	sepa_account_holder: string | null;
}
