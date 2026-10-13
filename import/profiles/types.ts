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
