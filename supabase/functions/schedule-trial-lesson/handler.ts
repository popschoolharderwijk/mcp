import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { createTrialSchedule, markSignupScheduled } from './createTrialSchedule.ts';
import { ensureStudentUser } from './ensureStudentUser.ts';
import { resolveStudentData } from './resolveStudentData.ts';
import { requireScheduleTrialLessonAccess, runScheduleTrialLessonSafely } from './scheduleTrialLessonAccess.ts';
import { buildScheduleTrialLessonSuccessPayload } from './scheduleTrialLessonHelpers.ts';
import { sendTrialNotifications } from './sendTrialNotifications.ts';
import type { Body } from './types.ts';
import { computeEndTime, validateScheduleBody, validateStudentData } from './validation.ts';

async function scheduleTrialLessonForStudent(
	admin: SupabaseClient,
	req: Request,
	body: Body,
	resolved: Extract<Awaited<ReturnType<typeof resolveStudentData>>, { ok: true }>['data'],
): Promise<Response> {
	const ensured = await ensureStudentUser(admin, {
		studentEmail: resolved.studentEmail,
		studentFirstName: resolved.studentFirstName,
		studentLastName: resolved.studentLastName,
		studentPhone: resolved.studentPhone,
		studentPayload: {
			date_of_birth: resolved.studentDob,
			parent_name: resolved.parentName,
			parent_email: resolved.parentEmail,
			parent_phone: resolved.parentPhone,
		},
	});
	if (!ensured.ok) return ensured.response;

	const endTime = computeEndTime(body.scheduled_start_time, body.duration_minutes);
	const scheduled = await createTrialSchedule(admin, body, {
		studentUserId: ensured.studentUserId,
		lessonTypeId: resolved.lessonTypeId,
		lessonTypeOptionId: resolved.lessonTypeOptionId,
		endTime,
		studentFirstName: resolved.studentFirstName,
		studentLastName: resolved.studentLastName,
	});
	if (!scheduled.ok) return scheduled.response;

	await markSignupScheduled(admin, resolved.signupReq);
	await sendTrialNotifications(admin, req, body, {
		studentFirstName: resolved.studentFirstName,
		studentLastName: resolved.studentLastName,
		studentEmail: resolved.studentEmail,
		parentEmail: resolved.parentEmail,
		lessonTypeName: scheduled.result.lessonTypeName,
		teacherUserId: body.teacher_user_id,
	});

	return jsonResponse(
		200,
		buildScheduleTrialLessonSuccessPayload({
			trialId: scheduled.result.trialId,
			studentUserId: ensured.studentUserId,
			agendaEventId: scheduled.result.agendaEventId,
		}),
	);
}

async function executeScheduleTrialLesson(authHeader: string, body: Body, req: Request): Promise<Response> {
	const access = await requireScheduleTrialLessonAccess(authHeader);
	if (!access.ok) return access.response;

	const resolved = await resolveStudentData(access.admin, body);
	if (!resolved.ok) return resolved.response;

	const studentValidation = validateStudentData(
		resolved.data.studentEmail,
		resolved.data.studentFirstName,
		resolved.data.studentLastName,
		resolved.data.lessonTypeId,
	);
	if (studentValidation) return studentValidation;

	return runScheduleTrialLessonSafely(() => scheduleTrialLessonForStudent(access.admin, req, body, resolved.data));
}

export async function handleScheduleTrialLesson(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<Body>(req);
	if (!begun.ok) return begun.response;

	const validationError = validateScheduleBody(begun.body);
	if (validationError) return validationError;

	return executeScheduleTrialLesson(begun.authHeader, begun.body, req);
}
