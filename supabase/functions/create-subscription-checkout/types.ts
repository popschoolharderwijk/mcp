export interface Body {
	lesson_agreement_id: string;
	mode?: 'checkout' | 'direct' | 'complete';
	checkout_session_id?: string;
	success_url?: string;
	cancel_url?: string;
}

export interface AgreementRow {
	id: string;
	student_user_id: string;
	is_active: boolean;
	payment_method?: string | null;
}

export interface ProfileRow {
	email: string;
	first_name: string | null;
	last_name: string | null;
}

export type CheckoutMode = 'checkout' | 'direct' | 'complete';
