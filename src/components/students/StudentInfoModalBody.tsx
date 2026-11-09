import { LuCalendar, LuMail, LuPhone, LuUser, LuUsers } from 'react-icons/lu';
import { Separator } from '@/components/ui/separator';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { formatPhoneNumber, hasParentContactInfo } from '@/lib/students/studentInfoHelpers';
import { buildStudentInfoModalView } from '@/lib/students/studentInfoModalBodyHelpers';
import type { Student } from '@/types/students';
import type { User } from '@/types/users';

interface InfoRowProps {
	label: string;
	value: string | null | undefined;
	icon?: React.ReactNode;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
	return (
		<div className="flex items-start gap-3">
			{icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
			<div className="min-w-0 flex-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="text-sm font-medium">{value || '-'}</p>
			</div>
		</div>
	);
}

interface InfoSectionProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
}

function InfoSection({ title, icon, children }: InfoSectionProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 text-muted-foreground">
				{icon}
				<h3 className="text-sm font-semibold">{title}</h3>
			</div>
			<div className="space-y-2 pl-6">{children}</div>
		</div>
	);
}

interface StudentInfoModalBodyProps {
	display: User;
	fullData: Student | null;
	canViewFullData: boolean;
}

function ParentGuardianSection({ fullData }: { fullData: Student }) {
	const hasContact = hasParentContactInfo(fullData.parent_name, fullData.parent_email, fullData.parent_phone_number);

	return (
		<>
			<Separator />
			<InfoSection title="Ouder/voogd" icon={<LuUsers className="h-4 w-4" />}>
				{hasContact ? (
					<>
						<InfoRow label="Naam" value={fullData.parent_name} />
						<InfoRow label="Email" value={fullData.parent_email} icon={<LuMail className="h-4 w-4" />} />
						<InfoRow
							label="Telefoonnummer"
							value={formatPhoneNumber(fullData.parent_phone_number)}
							icon={<LuPhone className="h-4 w-4" />}
						/>
					</>
				) : (
					<p className="text-sm text-muted-foreground italic">Geen ouder/voogd gegevens bekend</p>
				)}
			</InfoSection>
		</>
	);
}

function MetadataSection({ fullData }: { fullData: Student }) {
	return (
		<>
			<Separator />
			<div className="text-xs text-muted-foreground space-y-1">
				<p>Aangemaakt: {new Date(fullData.created_at).toLocaleString('nl-NL')}</p>
				<p>Laatst bijgewerkt: {new Date(fullData.updated_at).toLocaleString('nl-NL')}</p>
			</div>
		</>
	);
}

function DateOfBirthRow({ dateOfBirth }: { dateOfBirth: string | null }) {
	if (!dateOfBirth) return null;
	return (
		<InfoRow
			label="Geboortedatum"
			value={formatDbDateToUi(dateOfBirth)}
			icon={<LuCalendar className="h-4 w-4" />}
		/>
	);
}

function PrivilegedStudentSections({ fullData }: { fullData: Student | null }) {
	if (!fullData) return null;
	return (
		<>
			<ParentGuardianSection fullData={fullData} />
			<MetadataSection fullData={fullData} />
		</>
	);
}

function LimitedAccessNotice({ show }: { show: boolean }) {
	if (!show) return null;
	return (
		<p className="text-xs text-muted-foreground italic text-center py-2">
			Je hebt alleen toegang tot beperkte leerlinginformatie.
		</p>
	);
}

export function StudentInfoModalBody({ display, fullData, canViewFullData }: StudentInfoModalBodyProps) {
	const view = buildStudentInfoModalView(fullData, canViewFullData);

	return (
		<div className="space-y-5 py-2">
			<InfoSection title="Contactgegevens" icon={<LuUser className="h-4 w-4" />}>
				<InfoRow label="Email" value={display.email} icon={<LuMail className="h-4 w-4" />} />
				<InfoRow
					label="Telefoonnummer"
					value={formatPhoneNumber(display.phone_number)}
					icon={<LuPhone className="h-4 w-4" />}
				/>
				<DateOfBirthRow dateOfBirth={view.showDateOfBirth ? view.dateOfBirth : null} />
			</InfoSection>

			<PrivilegedStudentSections fullData={view.showPrivilegedBlock ? fullData : null} />
			<LimitedAccessNotice show={view.showLimitedAccessNotice} />
		</div>
	);
}
