import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProfileAddressFormFields } from '@/components/profile/ProfileAddressFormFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import { SubmitButton } from '@/components/ui/submit-button';
import { supabase } from '@/integrations/supabase/client';
import {
	buildProfileAddressUpdateFields,
	emptyProfileAddressForm,
	getProfileAddressValidationError,
	PROFILE_ADDRESS_SELECT,
	profileAddressFormFromFields,
} from '@/lib/profile/profileAddressHelpers';
import type { ProfileAddressFields, ProfileAddressFormState } from '@/types/profile-address';

interface TeacherAddressSectionProps {
	userId: string;
	canEdit: boolean;
	initialAddress?: Partial<ProfileAddressFields> | null;
	onUpdate?: () => void;
}

async function loadProfileAddress(userId: string): Promise<ProfileAddressFormState> {
	const { data, error } = await supabase
		.from('profiles')
		.select(PROFILE_ADDRESS_SELECT)
		.eq('user_id', userId)
		.single();

	if (error) throw error;
	return profileAddressFormFromFields(data as unknown as ProfileAddressFields);
}

export function TeacherAddressSection({ userId, canEdit, initialAddress, onUpdate }: TeacherAddressSectionProps) {
	const hasInitial = initialAddress != null;
	const [form, setForm] = useState<ProfileAddressFormState>(() =>
		hasInitial ? profileAddressFormFromFields(initialAddress) : emptyProfileAddressForm,
	);
	const [loading, setLoading] = useState(!hasInitial);
	const [saving, setSaving] = useState(false);

	const initialStreetName = initialAddress?.street_name;
	const initialHouseNumber = initialAddress?.house_number;
	const initialPostalCode = initialAddress?.postal_code;
	const initialCity = initialAddress?.city;
	const initialCountryCode = initialAddress?.country_code;

	useEffect(() => {
		if (hasInitial) {
			setForm(
				profileAddressFormFromFields({
					street_name: initialStreetName,
					house_number: initialHouseNumber,
					postal_code: initialPostalCode,
					city: initialCity,
					country_code: initialCountryCode,
				}),
			);
			setLoading(false);
			return;
		}

		setLoading(true);
		void loadProfileAddress(userId)
			.then((loaded) => {
				setForm(loaded);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error loading address:', error);
				toast.error('Fout bij laden adres');
				setLoading(false);
			});
	}, [hasInitial, initialStreetName, initialHouseNumber, initialPostalCode, initialCity, initialCountryCode, userId]);

	const onSave = async () => {
		const validationError = getProfileAddressValidationError(form);
		if (validationError) {
			toast.error(validationError);
			return;
		}

		setSaving(true);
		try {
			const { error } = await supabase
				.from('profiles')
				.update(buildProfileAddressUpdateFields(form) as never)
				.eq('user_id', userId);

			if (error) {
				toast.error('Fout bij opslaan adres', { description: error.message });
				return;
			}
			toast.success('Adres bijgewerkt');
			onUpdate?.();
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <SectionSkeleton />;

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Adres</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<ProfileAddressFormFields
					idPrefix="teacher-address"
					form={form}
					onChange={setForm}
					disabled={!canEdit}
				/>
				{canEdit && (
					<div className="flex justify-end pt-2">
						<SubmitButton onClick={() => void onSave()} loading={saving} loadingLabel="Opslaan...">
							Opslaan
						</SubmitButton>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
