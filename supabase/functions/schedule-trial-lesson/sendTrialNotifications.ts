import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import {
	buildTrialNotificationRecipient,
	buildTrialSharedVars,
	buildTrialTeacherName,
} from './sendTrialNotificationsHelpers.ts';
import type { Body } from './types.ts';

export async function sendTrialNotifications(
	admin: SupabaseClient,
	req: Request,
	body: Body,
	args: {
		studentFirstName: string;
		studentLastName: string;
		studentEmail: string;
		parentEmail: string | null;
		lessonTypeName: string;
		teacherUserId: string;
	},
): Promise<void> {
	const { data: teacherProfile } = await admin
		.from('profiles')
		.select('email, first_name, last_name')
		.eq('user_id', args.teacherUserId)
		.maybeSingle();

	const sharedVars = buildTrialSharedVars({
		studentFirstName: args.studentFirstName,
		studentLastName: args.studentLastName,
		lessonTypeName: args.lessonTypeName,
		scheduledDate: body.scheduled_date,
		scheduledStartTime: body.scheduled_start_time,
		durationMinutes: body.duration_minutes,
	});
	const origin = req.headers.get('Origin');

	await sendTemplateEmail({
		event_key: 'trial_scheduled',
		to: buildTrialNotificationRecipient(args.parentEmail, args.studentEmail),
		vars: sharedVars,
		origin,
	});

	if (!teacherProfile?.email) return;

	await sendTemplateEmail({
		event_key: 'trial_scheduled_teacher',
		to: teacherProfile.email.toLowerCase(),
		vars: {
			...sharedVars,
			docent_naam: buildTrialTeacherName(teacherProfile.first_name, teacherProfile.last_name),
		},
		origin,
	});
}
