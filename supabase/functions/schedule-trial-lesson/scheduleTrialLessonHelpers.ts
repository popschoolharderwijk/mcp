export function buildScheduleTrialLessonSuccessPayload(args: {
	trialId: string;
	studentUserId: string;
	agendaEventId: string;
}) {
	return {
		trial_id: args.trialId,
		student_user_id: args.studentUserId,
		agenda_event_id: args.agendaEventId,
	};
}
