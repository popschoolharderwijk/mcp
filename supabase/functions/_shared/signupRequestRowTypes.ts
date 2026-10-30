export interface SignupRequestRowCore {
	id: string;
	status: string;
	email: string;
	first_name: string;
	last_name: string;
	phone_number: string | null;
	date_of_birth: string | null;
	parent_name: string | null;
	parent_email: string | null;
	parent_phone_number: string | null;
}
