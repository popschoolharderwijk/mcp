export function buildTrialNotificationRecipient(parentEmail: string | null, studentEmail: string): string {
	return (parentEmail || studentEmail).toLowerCase();
}

export function buildTrialSharedVars(args: {
	studentFirstName: string;
	studentLastName: string;
	lessonTypeName: string;
	scheduledDate: string;
	scheduledStartTime: string;
	durationMinutes: number;
}) {
	return {
		leerling_naam: `${args.studentFirstName} ${args.studentLastName}`.trim(),
		les_type: args.lessonTypeName,
		datum: args.scheduledDate,
		tijd: args.scheduledStartTime.slice(0, 5),
		duur: String(args.durationMinutes),
	};
}

export function buildTrialTeacherName(firstName: string | null, lastName: string | null): string {
	const teacherName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
	return teacherName.length > 0 ? teacherName : 'docent';
}

export function shouldSendTrialTeacherNotification(teacherEmail: string | null | undefined): boolean {
	return Boolean(teacherEmail);
}
