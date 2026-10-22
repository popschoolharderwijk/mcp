import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildTrialParticipantRows,
	buildTrialScheduleSuccessResult,
	resolveTrialLessonTypeMeta,
} from './createTrialScheduleHelpers.ts';
import { buildTrialAgendaEventInsertRow, buildTrialLessonInsertRow } from './trialSchedulePayloadHelpers.ts';
import type { Body } from './types.ts';

interface TrialScheduleResult {
	trialId: string;
	agendaEventId: string;
	lessonTypeName: string;
}

interface CreateTrialScheduleArgs {
	studentUserId: string;
	lessonTypeId: string;
	lessonTypeOptionId: string | null;
	endTime: string;
	studentFirstName: string;
	studentLastName: string;
}

async function insertTrialLesson(
	admin: SupabaseClient,
	body: Body,
	args: CreateTrialScheduleArgs,
): Promise<{ ok: true; trialId: string } | { ok: false; response: Response }> {
	const { data, error } = await admin
		.from('trial_lessons')
		.insert(
			buildTrialLessonInsertRow(body, {
				studentUserId: args.studentUserId,
				lessonTypeId: args.lessonTypeId,
				lessonTypeOptionId: args.lessonTypeOptionId,
			}),
		)
		.select('id')
		.single();
	if (error || !data) {
		console.error('trial insert', error);
		return { ok: false, response: jsonResponse(500, { error: 'Kon proefles niet aanmaken' }) };
	}
	return { ok: true, trialId: data.id };
}

async function rollbackTrialLesson(admin: SupabaseClient, trialId: string): Promise<void> {
	await admin.from('trial_lessons').delete().eq('id', trialId);
}

async function insertTrialAgendaEvent(
	admin: SupabaseClient,
	body: Body,
	args: CreateTrialScheduleArgs,
	trialId: string,
): Promise<{ ok: true; agendaEventId: string; lessonTypeName: string } | { ok: false; response: Response }> {
	const { data: lessonType } = await admin
		.from('lesson_types')
		.select('name, color')
		.eq('id', args.lessonTypeId)
		.maybeSingle();
	const { lessonTypeName, lessonTypeColor } = resolveTrialLessonTypeMeta(lessonType);

	const { data, error } = await admin
		.from('agenda_events')
		.insert(
			buildTrialAgendaEventInsertRow(body, {
				trialId,
				endTime: args.endTime,
				lessonTypeName,
				lessonTypeColor,
				studentFirstName: args.studentFirstName,
				studentLastName: args.studentLastName,
			}),
		)
		.select('id')
		.single();

	if (error || !data) {
		console.error('agenda insert', error);
		await rollbackTrialLesson(admin, trialId);
		return { ok: false, response: jsonResponse(500, { error: 'Kon agenda-event niet aanmaken' }) };
	}

	return { ok: true, agendaEventId: data.id, lessonTypeName };
}

async function linkTrialSchedule(
	admin: SupabaseClient,
	body: Body,
	args: CreateTrialScheduleArgs,
	trialId: string,
	agendaEventId: string,
): Promise<void> {
	await admin
		.from('agenda_participants')
		.insert(buildTrialParticipantRows(agendaEventId, body.teacher_user_id, args.studentUserId));
	await admin.from('trial_lessons').update({ agenda_event_id: agendaEventId }).eq('id', trialId);
}

export async function createTrialSchedule(
	admin: SupabaseClient,
	body: Body,
	args: CreateTrialScheduleArgs,
): Promise<{ ok: true; result: TrialScheduleResult } | { ok: false; response: Response }> {
	const trialInserted = await insertTrialLesson(admin, body, args);
	if (!trialInserted.ok) return trialInserted;

	const agendaInserted = await insertTrialAgendaEvent(admin, body, args, trialInserted.trialId);
	if (!agendaInserted.ok) return agendaInserted;

	await linkTrialSchedule(admin, body, args, trialInserted.trialId, agendaInserted.agendaEventId);
	return {
		ok: true,
		result: buildTrialScheduleSuccessResult(
			trialInserted.trialId,
			agendaInserted.agendaEventId,
			agendaInserted.lessonTypeName,
		),
	};
}

export async function markSignupScheduled(admin: SupabaseClient, signupReq: { id: string } | null): Promise<void> {
	if (!signupReq) return;
	await admin.from('lesson_signup_requests').update({ status: 'trial_scheduled' }).eq('id', signupReq.id);
}
