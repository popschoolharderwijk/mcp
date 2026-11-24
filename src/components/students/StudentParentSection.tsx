import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import { StudentFormParentSection } from '@/components/students/StudentFormParentSection';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';

interface StudentParentSectionProps {
	vm: StudentFormFieldsViewModel;
	saving: boolean;
	onSave: () => void;
	canEdit?: boolean;
	saveDisabled?: boolean;
}

export function StudentParentSection({
	vm,
	saving,
	onSave,
	canEdit = true,
	saveDisabled = false,
}: StudentParentSectionProps) {
	return (
		<ProfileFormSaveCard
			title="Ouder/voogd gegevens"
			saving={saving}
			onSave={onSave}
			canEdit={canEdit}
			disabled={saveDisabled}
		>
			<StudentFormParentSection vm={vm} canEdit={canEdit} />
		</ProfileFormSaveCard>
	);
}
