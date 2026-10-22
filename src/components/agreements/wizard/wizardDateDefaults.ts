import { resolveDefaultAgreementEndDate } from '@/lib/billing/schoolYear';
import { addDaysFromNow, formatDateToDb } from '@/lib/date/date-format';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { AgreementsSetting, SchoolYearSetting } from '@/lib/settings/appSettingsTypes';

export function wizardDefaultStartDate(agreements: AgreementsSetting = APP_SETTINGS_BOOTSTRAP.agreements): string {
	return formatDateToDb(addDaysFromNow(agreements.default_start_offset_days));
}

export function wizardDefaultEndDate(
	schoolYear: SchoolYearSetting = APP_SETTINGS_BOOTSTRAP.school_year,
	asOf: Date = new Date(),
): string {
	return resolveDefaultAgreementEndDate(asOf, schoolYear);
}
