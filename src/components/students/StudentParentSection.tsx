import { StudentFormParentSection } from '@/components/students/StudentFormParentSection';
import { StudentFormSaveCard } from '@/components/students/StudentFormSaveCard';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';

interface StudentParentSectionProps {
	vm: StudentFormFieldsViewModel;
	saving: boolean;
	onSave: () => void;
}

export function StudentParentSection({ vm, saving, onSave }: StudentParentSectionProps) {
	return (
		<StudentFormSaveCard title="Ouder/voogd gegevens" saving={saving} onSave={onSave}>
			<StudentFormParentSection vm={vm} />
		</StudentFormSaveCard>
	);
}
