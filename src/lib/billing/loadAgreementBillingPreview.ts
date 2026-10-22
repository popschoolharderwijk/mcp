import { supabase } from '@/integrations/supabase/client';
import {
	type AgreementBillingPreview,
	type AgreementBillingPreviewInput,
	computeAgreementBillingPreview,
} from '@/lib/billing/agreementBillingPreviewHelpers';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import { mergeAppSettingsRows } from '@/lib/settings/appSettingsMergeHelpers';

export interface AgreementBillingPreviewLoadResult {
	preview: AgreementBillingPreview | null;
	error: string | null;
}

export async function loadAgreementBillingPreview(
	agreement: AgreementBillingPreviewInput,
	today: string,
): Promise<AgreementBillingPreviewLoadResult> {
	const [
		{ data: option, error: optErr },
		{ data: student, error: studErr },
		{ data: noLessonData },
		{ data: settingsRows },
	] = await Promise.all([
		supabase
			.from('lesson_type_options')
			.select('price_per_lesson_youth_cents, price_per_lesson_adult_cents')
			.eq('lesson_type_id', agreement.lesson_type_id)
			.eq('frequency', agreement.frequency)
			.eq('duration_minutes', agreement.duration_minutes)
			.maybeSingle(),
		supabase.from('students').select('date_of_birth').eq('user_id', agreement.student_user_id).maybeSingle(),
		supabase.from('no_lesson_periods').select('start_date, end_date'),
		supabase.from('app_settings').select('key, value').in('key', ['school_year', 'vat']),
	]);

	if (optErr || studErr) {
		return {
			preview: null,
			error: optErr?.message ?? studErr?.message ?? 'Kon prijsgegevens niet laden',
		};
	}

	const settings = mergeAppSettingsRows(APP_SETTINGS_BOOTSTRAP, settingsRows ?? []);

	const result = computeAgreementBillingPreview(
		agreement,
		option,
		student?.date_of_birth ?? null,
		noLessonData ?? [],
		today,
		settings.school_year,
		settings.vat.age_threshold_years,
	);

	if (result.ok === false) {
		return { preview: result.preview, error: result.error };
	}

	return { preview: result.preview, error: null };
}
