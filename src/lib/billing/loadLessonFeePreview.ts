/**
 * Fee preview via the database fee rules (RPC preview_lesson_fee). No fee logic lives here:
 * this only picks which months to show and maps the result.
 */
import { supabase } from '@/integrations/supabase/client';
import { type LessonFee, monthStart, nextBillableMonth } from '@/lib/billing/lessonFeeFormat';

export interface LessonFeePreviewInput {
	lesson_type_option_id: string;
	date_of_birth: string | null;
	start_date: string;
	end_date: string | null;
}

export interface LessonFeePreview {
	/** Fee in the start month (pro rata or one-off). */
	firstMonth: LessonFee & { month: string };
	/** Fee in the next billable month, null for one-off forms or when it is 0. */
	regularMonth: (LessonFee & { month: string }) | null;
}

export interface LessonFeePreviewResult {
	preview: LessonFeePreview | null;
	error: string | null;
}

/** Months to show: the start month and the next billable month (August skipped). */
export function resolvePreviewMonths(startDate: string): [string, string] {
	return [monthStart(startDate), nextBillableMonth(startDate)];
}

export function buildLessonFeePreview(
	months: [string, string],
	first: LessonFee,
	regular: LessonFee | null,
): LessonFeePreview {
	return {
		firstMonth: { ...first, month: months[0] },
		regularMonth: regular && regular.amount_cents > 0 ? { ...regular, month: months[1] } : null,
	};
}

async function fetchFee(input: LessonFeePreviewInput, month: string): Promise<LessonFee> {
	const { data, error } = await supabase.rpc('preview_lesson_fee', {
		p_lesson_type_option_id: input.lesson_type_option_id,
		p_date_of_birth: input.date_of_birth as string,
		p_start_date: input.start_date,
		p_end_date: input.end_date as string,
		p_month: month,
	});
	if (error) throw new Error(error.message);
	const row = (data ?? [])[0];
	if (!row) throw new Error('Geen bedrag berekend');
	return row as LessonFee;
}

export async function loadLessonFeePreview(input: LessonFeePreviewInput): Promise<LessonFeePreviewResult> {
	const months = resolvePreviewMonths(input.start_date);
	try {
		const [first, regular] = await Promise.all([fetchFee(input, months[0]), fetchFee(input, months[1])]);
		return { preview: buildLessonFeePreview(months, first, regular), error: null };
	} catch (e) {
		return { preview: null, error: e instanceof Error ? e.message : 'Kon het bedrag niet berekenen' };
	}
}

/** Preview for a stored agreement: reads its lesson form, period and the student's date of birth. */
export async function loadAgreementFeePreview(
	agreementId: string,
	studentUserId: string,
): Promise<LessonFeePreviewResult> {
	const [{ data: agreement, error: aErr }, { data: student, error: sErr }] = await Promise.all([
		supabase
			.from('lesson_agreements')
			.select('lesson_type_option_id, start_date, end_date, cancellation_effective_date')
			.eq('id', agreementId)
			.maybeSingle(),
		supabase.from('students').select('date_of_birth').eq('user_id', studentUserId).maybeSingle(),
	]);
	if (aErr || sErr) return { preview: null, error: aErr?.message ?? sErr?.message ?? 'Kon gegevens niet laden' };
	if (!agreement?.lesson_type_option_id) {
		return { preview: null, error: 'Deze overeenkomst heeft nog geen lesvorm met tarief.' };
	}
	const ends = [agreement.end_date, agreement.cancellation_effective_date].filter((d): d is string => Boolean(d));
	return loadLessonFeePreview({
		lesson_type_option_id: agreement.lesson_type_option_id,
		date_of_birth: student?.date_of_birth ?? null,
		start_date: agreement.start_date,
		end_date: ends.length ? ends.sort()[0] : null,
	});
}
