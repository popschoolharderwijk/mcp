import {
	AgendaSettingsForm,
	AgreementsSettingsForm,
	BrandingSettingsForm,
	SchoolYearSettingsForm,
	TrialLessonsSettingsForm,
	VatSettingsForm,
} from '@/components/settings/AppSettingsForms';
import { EmailTemplatesManager } from '@/components/settings/EmailTemplatesManager';
import { NoLessonPeriodsManager } from '@/components/settings/NoLessonPeriodsManager';
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
import {
	APP_SETTINGS_TAB_ITEMS,
	type AppSettingsTabId,
	isAppSettingsTabId,
} from '@/lib/settings/appSettingsTabsHelpers';
import type { AppSettingsMap, AppSettingValueByKey } from '@/lib/settings/appSettingsTypes';

interface AppSettingsTabPanelsProps {
	settings: AppSettingsMap;
	canEdit: boolean;
	savingKey: string | null;
	activeTab: AppSettingsTabId;
	onTabChange: (tab: AppSettingsTabId) => void;
	onSave: <K extends keyof AppSettingsMap>(key: K, value: AppSettingValueByKey[K]) => Promise<void>;
}

export function AppSettingsTabPanels({
	settings,
	canEdit,
	savingKey,
	activeTab,
	onTabChange,
	onSave,
}: AppSettingsTabPanelsProps) {
	return (
		<PageTabs
			value={activeTab}
			onValueChange={onTabChange}
			isTabId={isAppSettingsTabId}
			items={APP_SETTINGS_TAB_ITEMS}
		>
			<PageTabsContent value="school-year">
				<SchoolYearSettingsForm
					canEdit={canEdit}
					initial={settings.school_year}
					saving={savingKey === 'school_year'}
					onSave={(value) => onSave('school_year', value)}
				/>
			</PageTabsContent>

			<PageTabsContent value="no-lesson-periods">
				<NoLessonPeriodsManager />
			</PageTabsContent>

			<PageTabsContent value="agenda">
				<AgendaSettingsForm
					canEdit={canEdit}
					initial={settings.agenda}
					saving={savingKey === 'agenda'}
					onSave={(value) => onSave('agenda', value)}
				/>
			</PageTabsContent>

			<PageTabsContent value="vat">
				<VatSettingsForm
					canEdit={canEdit}
					initial={settings.vat}
					saving={savingKey === 'vat'}
					onSave={(value) => onSave('vat', value)}
				/>
			</PageTabsContent>

			<PageTabsContent value="branding">
				<BrandingSettingsForm
					canEdit={canEdit}
					initial={settings.branding}
					saving={savingKey === 'branding'}
					onSave={(value) => onSave('branding', value)}
				/>
			</PageTabsContent>

			<PageTabsContent value="trial-lessons">
				<TrialLessonsSettingsForm
					canEdit={canEdit}
					initial={settings.trial_lessons}
					saving={savingKey === 'trial_lessons'}
					onSave={(value) => onSave('trial_lessons', value)}
				/>
			</PageTabsContent>

			<PageTabsContent value="agreements">
				<AgreementsSettingsForm
					canEdit={canEdit}
					initial={settings.agreements}
					saving={savingKey === 'agreements'}
					onSave={(value) => onSave('agreements', value)}
				/>
			</PageTabsContent>

			<PageTabsContent value="email-templates">
				<EmailTemplatesManager canEdit={canEdit} />
			</PageTabsContent>
		</PageTabs>
	);
}
