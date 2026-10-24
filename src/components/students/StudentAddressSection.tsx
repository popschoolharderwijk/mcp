import { ProfileAddressFormFields } from '@/components/profile/ProfileAddressFormFields';
import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';

interface StudentAddressSectionProps {
	vm: StudentFormFieldsViewModel;
	saving: boolean;
	onSave: () => void;
}

export function StudentAddressSection({ vm, saving, onSave }: StudentAddressSectionProps) {
	const { form, setForm } = vm;

	return (
		<ProfileFormSaveCard title="Adres" saving={saving} onSave={onSave}>
			<ProfileAddressFormFields
				idPrefix="student-address"
				form={{
					street_name: form.street_name,
					house_number: form.house_number,
					postal_code: form.postal_code,
					city: form.city,
					country_code: form.country_code,
				}}
				onChange={(address) => setForm({ ...form, ...address })}
			/>
		</ProfileFormSaveCard>
	);
}
