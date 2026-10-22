import { wizardDefaultEndDate, wizardDefaultStartDate } from '@/components/agreements/wizard/wizardDateDefaults';
import type { AgreementsSetting, SchoolYearSetting } from '@/lib/settings/appSettingsTypes';

export function lessonGroupDefaultStartDate(agreements?: AgreementsSetting): string {
	return wizardDefaultStartDate(agreements);
}

export function lessonGroupDefaultEndDate(schoolYear?: SchoolYearSetting, asOf?: Date): string {
	return wizardDefaultEndDate(schoolYear, asOf);
}
