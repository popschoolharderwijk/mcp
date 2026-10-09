import type { ReactNode } from 'react';
import { AgendaView } from '@/components/agenda/AgendaView';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { SignupRequestItem } from '@/components/students/SignupRequestItem';
import { StudentAddressSection } from '@/components/students/StudentAddressSection';
import { StudentParentSection } from '@/components/students/StudentParentSection';
import { StudentAgreementsCard, StudentSignupRequestsCard } from '@/components/students/StudentProfileCards';
import { StudentProfileSection } from '@/components/students/StudentProfileSection';
import { useStudentProfileForm } from '@/components/students/useStudentProfileForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { resolveStudentInfoTabsDefaultValue } from '@/lib/students/studentInfoTabsHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';
import type { Student } from '@/types/students';

interface StudentInfoTabsProps {
	userId: string;
	student: Student;
	agreements: LessonAgreementWithTeacher[];
	signupRequests: SignupRequestDetail[];
	isPrivileged: boolean;
	canEditAgenda: boolean;
	onProfileUpdate: () => void;
}

/** Keep form/list cards half-width on large screens (same as teacher profile column). */
function HalfWidthTabPanel({ children }: { children: ReactNode }) {
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<div className="min-w-0">{children}</div>
		</div>
	);
}

function StudentPrivilegedFormTabs({ student, onProfileUpdate }: { student: Student; onProfileUpdate: () => void }) {
	const { vm, saving, runSave, setDateOfBirthDraftSynced } = useStudentProfileForm(student, onProfileUpdate);

	return (
		<>
			<TabsContent value="profile">
				<HalfWidthTabPanel>
					<StudentProfileSection
						vm={vm}
						saving={saving}
						onSave={() => void runSave('profile')}
						onDateOfBirthDraftSyncedChange={setDateOfBirthDraftSynced}
					/>
				</HalfWidthTabPanel>
			</TabsContent>
			<TabsContent value="address">
				<HalfWidthTabPanel>
					<StudentAddressSection vm={vm} saving={saving} onSave={() => void runSave('address')} />
				</HalfWidthTabPanel>
			</TabsContent>
			<TabsContent value="parent">
				<HalfWidthTabPanel>
					<StudentParentSection vm={vm} saving={saving} onSave={() => void runSave('parent')} />
				</HalfWidthTabPanel>
			</TabsContent>
		</>
	);
}

function StudentInfoSharedTabs({
	userId,
	agreements,
	signupRequests,
	canEditAgenda,
}: {
	userId: string;
	agreements: LessonAgreementWithTeacher[];
	signupRequests: SignupRequestDetail[];
	canEditAgenda: boolean;
}) {
	return (
		<>
			<TabsContent value="agreements">
				<HalfWidthTabPanel>
					<StudentAgreementsCard
						agreements={agreements}
						description="Alle overeenkomsten van deze leerling"
						emptyMessage="Geen lesovereenkomsten"
						studentUserId={userId}
					/>
				</HalfWidthTabPanel>
			</TabsContent>

			<TabsContent value="signups">
				<StudentSignupRequestsCard
					requests={signupRequests}
					description="Aanmeldingen gekoppeld aan dit e-mailadres"
					emptyMessage="Geen aanmeldingen"
					renderItem={(request) => <SignupRequestItem key={request.id} request={request} />}
				/>
			</TabsContent>

			<TabsContent value="agenda">
				<AgendaView userId={userId} canEdit={canEditAgenda} />
			</TabsContent>
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
	onProfileUpdate,
}: StudentInfoTabsProps) {
	return (
		<Tabs defaultValue={resolveStudentInfoTabsDefaultValue(isPrivileged)} className="space-y-2">
			<TabsList>
				{isPrivileged && (
					<>
						<TabsTrigger value="profile">Profiel</TabsTrigger>
						<TabsTrigger value="address">Adres</TabsTrigger>
						<TabsTrigger value="parent">Ouder/voogd</TabsTrigger>
					</>
				)}
				<TabsTrigger value="agreements">Lesovereenkomsten ({agreements.length})</TabsTrigger>
				<TabsTrigger value="signups">Aanmeldingen ({signupRequests.length})</TabsTrigger>
				<TabsTrigger value="agenda">Agenda</TabsTrigger>
			</TabsList>

			{isPrivileged && <StudentPrivilegedFormTabs student={student} onProfileUpdate={onProfileUpdate} />}

			<StudentInfoSharedTabs
				userId={userId}
				agreements={agreements}
				signupRequests={signupRequests}
				canEditAgenda={canEditAgenda}
			/>
		</Tabs>
	);
}
