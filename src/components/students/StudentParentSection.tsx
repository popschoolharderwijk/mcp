import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import { StudentFormParentSection } from '@/components/students/StudentFormParentSection';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';

interface StudentParentSectionProps {
	vm: StudentFormFieldsViewModel;
	saving: boolean;
	onSave: () => void;
}

export function StudentParentSection({ vm, saving, onSave }: StudentParentSectionProps) {
	return (
		<ProfileFormSaveCard title="Ouder/voogd gegevens" saving={saving} onSave={onSave}>
			<StudentFormParentSection vm={vm} />
		</ProfileFormSaveCard>
	);
}
