import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import { StudentFormPersonalSection } from '@/components/students/StudentFormPersonalSection';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';

interface StudentProfileSectionProps {
	vm: StudentFormFieldsViewModel;
	saving: boolean;
	onSave: () => void;
	onDateOfBirthDraftSyncedChange?: (synced: boolean) => void;
}

export function StudentProfileSection({
	vm,
	saving,
	onSave,
	onDateOfBirthDraftSyncedChange,
}: StudentProfileSectionProps) {
	return (
		<ProfileFormSaveCard title="Gegevens" saving={saving} onSave={onSave}>
			<div className="space-y-4">
				<StudentFormPersonalSection vm={vm} onDateOfBirthDraftSyncedChange={onDateOfBirthDraftSyncedChange} />
			</div>
		</ProfileFormSaveCard>
	);
}
