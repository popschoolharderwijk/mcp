import { AgendaView } from '@/components/agenda/AgendaView';
import { ScopedAgreementsTable } from '@/components/agreements/ScopedAgreementsTable';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { SignupRequestItem } from '@/components/students/SignupRequestItem';
import { StudentAddressSection } from '@/components/students/StudentAddressSection';
import { StudentParentSection } from '@/components/students/StudentParentSection';
import { StudentSignupRequestsCard } from '@/components/students/StudentProfileCards';
import { StudentProfileSection } from '@/components/students/StudentProfileSection';
import { useStudentProfileForm } from '@/components/students/useStudentProfileForm';
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
import { buildAgreementsTabLabel } from '@/lib/profile/personDetailTabsHelpers';
import { isStudentInfoTabId, type StudentInfoTabId } from '@/lib/students/studentInfoTabsHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';
import type { Student } from '@/types/students';

interface StudentInfoTabsProps {
	userId: string;
	student: Student;
	agreements: LessonAgreementWithTeacher[];
	signupRequests: SignupRequestDetail[];
	isPrivileged: boolean;
	canEditAgenda: boolean;
	activeTab: StudentInfoTabId;
	onTabChange: (tab: StudentInfoTabId) => void;
	onProfileUpdate: () => void;
}

function StudentPrivilegedFormTabs({ student, onProfileUpdate }: { student: Student; onProfileUpdate: () => void }) {
	const { vm, saving, runSave, setDateOfBirthDraftSynced } = useStudentProfileForm(student, onProfileUpdate);

	return (
		<>
			<PageTabsContent value="profile" panelWidth="1/2">
				<StudentProfileSection
					vm={vm}
					saving={saving}
					onSave={() => void runSave('profile')}
					onDateOfBirthDraftSyncedChange={setDateOfBirthDraftSynced}
				/>
			</PageTabsContent>
			<PageTabsContent value="address" panelWidth="1/2">
				<StudentAddressSection vm={vm} saving={saving} onSave={() => void runSave('address')} />
			</PageTabsContent>
			<PageTabsContent value="parent" panelWidth="1/2">
				<StudentParentSection vm={vm} saving={saving} onSave={() => void runSave('parent')} />
			</PageTabsContent>
		</>
	);
}

function StudentInfoSharedTabs({
	userId,
	signupRequests,
	canEditAgenda,
	canMutateAgreements,
	onAgreementsMutated,
}: {
	userId: string;
	signupRequests: SignupRequestDetail[];
	canEditAgenda: boolean;
	canMutateAgreements: boolean;
	onAgreementsMutated: () => void;
}) {
	return (
		<>
			<PageTabsContent value="agreements">
				<ScopedAgreementsTable
					studentUserId={userId}
					canMutate={canMutateAgreements}
					onAgreementsMutated={onAgreementsMutated}
				/>
			</PageTabsContent>

			<PageTabsContent value="signups" panelWidth="1/2">
				<StudentSignupRequestsCard
					requests={signupRequests}
					description="Aanmeldingen gekoppeld aan dit e-mailadres"
					emptyMessage="Geen aanmeldingen"
					renderItem={(request) => <SignupRequestItem key={request.id} request={request} />}
				/>
			</PageTabsContent>

			<PageTabsContent value="agenda">
				<AgendaView userId={userId} canEdit={canEditAgenda} />
			</PageTabsContent>
		</>
	);
}

export function StudentInfoTabs({
	userId,
	student,
	agreements,
	signupRequests,
	isPrivileged,
	canEditAgenda,
	activeTab,
	onTabChange,
	onProfileUpdate,
}: StudentInfoTabsProps) {
	const items = [
		...(isPrivileged
			? [
					{ value: 'profile' as const, label: 'Profiel' },
					{ value: 'address' as const, label: 'Adres' },
					{ value: 'parent' as const, label: 'Ouder/voogd' },
				]
			: []),
		{ value: 'agreements' as const, label: buildAgreementsTabLabel(agreements.length) },
		{ value: 'signups' as const, label: `Aanmeldingen (${signupRequests.length})` },
		{ value: 'agenda' as const, label: 'Agenda' },
	];

	return (
		<PageTabs value={activeTab} onValueChange={onTabChange} isTabId={isStudentInfoTabId} items={items}>
			{isPrivileged && <StudentPrivilegedFormTabs student={student} onProfileUpdate={onProfileUpdate} />}

			<StudentInfoSharedTabs
				userId={userId}
				signupRequests={signupRequests}
				canEditAgenda={canEditAgenda}
				canMutateAgreements={isPrivileged}
				onAgreementsMutated={onProfileUpdate}
			/>
		</PageTabs>
	);
}
