export function resolveExistingStudentUserId(existingProfile: { user_id: string } | null | undefined): string | null {
	return existingProfile?.user_id ?? null;
}

export function shouldUpdateStudentPhoneOnCreate(studentPhone: string | null): boolean {
	return studentPhone != null && studentPhone.length > 0;
}

export type TrialStudentPersistAction = 'insert_full' | 'insert_empty' | 'noop';

/** New users get full parent data; existing students are left untouched; missing student row gets an empty insert. */
export function resolveTrialStudentPersistAction(
	isNewUser: boolean,
	existingStudent: { user_id: string } | null | undefined,
): TrialStudentPersistAction {
	if (isNewUser) return 'insert_full';
	if (existingStudent) return 'noop';
	return 'insert_empty';
}

export function buildStudentAuthCreatePayload(args: {
	studentEmail: string;
	studentFirstName: string;
	studentLastName: string;
}) {
	return {
		email: args.studentEmail,
		email_confirm: true,
		user_metadata: { first_name: args.studentFirstName, last_name: args.studentLastName },
	};
}
