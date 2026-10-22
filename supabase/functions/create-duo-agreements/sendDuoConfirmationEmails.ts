import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import { buildDuoConfirmationEmailPlan, dispatchDuoConfirmationEmailJobs } from './duoConfirmationEmailHelpers.ts';
import type { Body } from './types.ts';

export async function sendDuoConfirmationEmails(admin: SupabaseClient, req: Request, body: Body): Promise<void> {
	try {
		const { data: lt } = await admin
			.from('lesson_types')
			.select('name')
			.eq('id', body.lesson_type_id)
			.maybeSingle();
		const { data: profs } = await admin
			.from('profiles')
			.select('user_id, email, first_name, last_name')
			.in('user_id', [body.student_user_id_a, body.student_user_id_b, body.teacher_user_id]);
		const plan = buildDuoConfirmationEmailPlan(body, lt?.name ?? '', profs, req.headers.get('Origin'));
		await dispatchDuoConfirmationEmailJobs(plan.jobs, plan.baseVars, plan.origin, sendTemplateEmail);
	} catch (mailErr) {
		console.error('duo agreement mail block', mailErr);
	}
}
