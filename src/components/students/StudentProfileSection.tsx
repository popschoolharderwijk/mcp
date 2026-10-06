import { StudentFormDebtorSection } from '@/components/students/StudentFormDebtorSection';
import { StudentFormPersonalSection } from '@/components/students/StudentFormPersonalSection';
import { StudentFormSaveCard } from '@/components/students/StudentFormSaveCard';
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
		<StudentFormSaveCard title="Gegevens" saving={saving} onSave={onSave}>
			<div className="space-y-4">
				<StudentFormPersonalSection vm={vm} onDateOfBirthDraftSyncedChange={onDateOfBirthDraftSyncedChange} />
				<StudentFormDebtorSection vm={vm} />
			</div>
		</StudentFormSaveCard>
	);
}
