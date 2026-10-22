export function resolveExistingStudentUserId(existingProfile: { user_id: string } | null | undefined): string | null {
	return existingProfile?.user_id ?? null;
}

export function shouldUpdateStudentPhoneOnCreate(studentPhone: string | null): boolean {
	return studentPhone != null && studentPhone.length > 0;
}

export function resolveStudentRowMutation(
	existingStudent: { user_id: string } | null | undefined,
): 'update' | 'insert' {
	return existingStudent ? 'update' : 'insert';
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
