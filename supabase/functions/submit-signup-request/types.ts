export interface SignupRequest {
	lesson_type_id: string;
	lesson_group_id?: string | null;
	lesson_type_option_id?: string | null;
	first_name: string;
	last_name: string;
	email: string;
	phone_number?: string | null;
	date_of_birth?: string | null;
	parent_name?: string | null;
	parent_email?: string | null;
	parent_phone_number?: string | null;
	notes?: string | null;
	sepa_iban?: string | null;
	sepa_account_holder?: string | null;
	sepa_bic?: string | null;
}

export interface SepaFields {
	sepaIban: string | null;
	sepaHolder: string | null;
	sepaBic: string | null;
}

export interface LessonTypeRow {
	id: string;
	is_active: boolean;
	is_group_lesson: boolean;
}
