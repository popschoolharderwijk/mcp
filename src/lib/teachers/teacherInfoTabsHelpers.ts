import type { ProfileAddressFields } from '@/types/profile-address';
import type { Teacher } from '@/types/teachers';

/** Address fields for the teacher Adres tab from a loaded teacher profile row. */
export function teacherAddressFieldsFromProfile(teacher: Teacher): ProfileAddressFields {
	return {
		street_name: teacher.street_name ?? null,
		house_number: teacher.house_number ?? null,
		postal_code: teacher.postal_code ?? null,
		city: teacher.city ?? null,
		country_code: teacher.country_code ?? 'NL',
	};
}
