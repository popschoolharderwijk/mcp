import { formatDate, formatPrice } from './formatHelpers.ts';
import { type Body, DAY_NAMES_NL, FREQUENCY_LABELS, PAYMENT_METHOD_LABELS } from './types.ts';

export interface DuoProfileRow {
	user_id: string;
	email: string | null;
	first_name: string | null;
	last_name: string | null;
}

export function formatPersonDisplayName(
	firstName: string | null | undefined,
	lastName: string | null | undefined,
	fallback: string,
): string {
	const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
	return name || fallback;
}

export function buildDuoConfirmationBaseVars(
	body: Body,
	lessonTypeName: string,
	teacherName: string,
): Record<string, string> {
	return {
		docent_naam: teacherName,
		les_type: lessonTypeName,
		frequentie: FREQUENCY_LABELS[body.frequency] ?? body.frequency,
		prijs_per_les: formatPrice(body.price_per_lesson),
		dag: DAY_NAMES_NL[body.day_of_week] ?? '',
		tijd: body.start_time.slice(0, 5),
		startdatum: formatDate(body.start_date),
		betaalmethode: PAYMENT_METHOD_LABELS.stripe,
	};
}

export function buildDuoStudentEmailJobs(
	body: Body,
	profMap: Map<string, DuoProfileRow>,
	teacher: DuoProfileRow | undefined,
): Array<{ studentEmail: string; studentName: string; teacherEmail: string | null }> {
	const jobs: Array<{ studentEmail: string; studentName: string; teacherEmail: string | null }> = [];
	for (const studentId of [body.student_user_id_a, body.student_user_id_b]) {
		const student = profMap.get(studentId);
		if (!student?.email) continue;
		jobs.push({
			studentEmail: student.email.toLowerCase(),
			studentName: formatPersonDisplayName(student.first_name, student.last_name, 'leerling'),
			teacherEmail: teacher?.email ? teacher.email.toLowerCase() : null,
		});
	}
	return jobs;
}

export function buildDuoTemplateEmailVars(
	baseVars: Record<string, string>,
	studentName: string,
): Record<string, string> {
	return { ...baseVars, leerling_naam: studentName };
}

export function buildDuoProfileMap(profiles: DuoProfileRow[] | null | undefined): Map<string, DuoProfileRow> {
	return new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
}

export interface DuoConfirmationEmailPlan {
	jobs: DuoConfirmationEmailJob[];
	baseVars: Record<string, string>;
	origin: string | null;
}

export function buildDuoConfirmationEmailPlan(
	body: Body,
	lessonTypeName: string,
	profiles: DuoProfileRow[] | null | undefined,
	origin: string | null,
): DuoConfirmationEmailPlan {
	const profMap = buildDuoProfileMap(profiles);
	const teacher = profMap.get(body.teacher_user_id);
	const teacherName = formatPersonDisplayName(teacher?.first_name, teacher?.last_name, 'docent');
	const baseVars = buildDuoConfirmationBaseVars(body, lessonTypeName, teacherName);
	const jobs = buildDuoStudentEmailJobs(body, profMap, teacher);
	return { jobs, baseVars, origin };
}

export interface DuoConfirmationEmailJob {
	studentEmail: string;
	studentName: string;
	teacherEmail: string | null;
}

export type DuoTemplateEmailSender = (args: {
	event_key: string;
	to: string;
	vars: Record<string, string>;
	origin: string | null;
}) => Promise<void>;

export async function dispatchDuoConfirmationEmailJobs(
	jobs: DuoConfirmationEmailJob[],
	baseVars: Record<string, string>,
	origin: string | null,
	sendEmail: DuoTemplateEmailSender,
): Promise<void> {
	for (const job of jobs) {
		await sendEmail({
			event_key: 'agreement_created',
			to: job.studentEmail,
			vars: buildDuoTemplateEmailVars(baseVars, job.studentName),
			origin,
		});
		if (job.teacherEmail) {
			await sendEmail({
				event_key: 'agreement_created_teacher',
				to: job.teacherEmail,
				vars: buildDuoTemplateEmailVars(baseVars, job.studentName),
				origin,
			});
		}
	}
}
