/** One auth user after teacher/student email dedupe (may hold both roles). */
export type ProfileSqlRow = {
	userId: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	phoneNumber: string | null;
	streetName: string | null;
	houseNumber: string | null;
	postalCode: string | null;
	city: string | null;
	countryCode: string;
	isTeacher: boolean;
	isStudent: boolean;
	cocIssuedOn: string | null;
	dateOfBirth: string | null;
};

/** Fields merged from a newly mapped teacher/student row into an existing profile. */
export type ProfileMergeIncoming = Pick<
	ProfileSqlRow,
	| 'email'
	| 'firstName'
	| 'lastName'
	| 'phoneNumber'
	| 'streetName'
	| 'houseNumber'
	| 'postalCode'
	| 'city'
	| 'countryCode'
> &
	Partial<Pick<ProfileSqlRow, 'isTeacher' | 'isStudent' | 'cocIssuedOn' | 'dateOfBirth'>>;
