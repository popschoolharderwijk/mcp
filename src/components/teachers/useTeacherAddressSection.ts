import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	buildProfileAddressUpdateFields,
	PROFILE_ADDRESS_SELECT,
	profileAddressFormFromFields,
} from '@/lib/profile/profileAddressHelpers';
import {
	resolveTeacherAddressBootstrap,
	resolveTeacherAddressSaveBlock,
	teacherAddressFormFromValueKey,
	teacherAddressValueKey,
} from '@/lib/teachers/teacherAddressSectionHelpers';
import type { ProfileAddressFields, ProfileAddressFormState } from '@/types/profile-address';

async function loadProfileAddress(userId: string): Promise<ProfileAddressFormState> {
	const { data, error } = await supabase
		.from('profiles')
		.select(PROFILE_ADDRESS_SELECT)
		.eq('user_id', userId)
		.single();

	if (error) throw error;
	return profileAddressFormFromFields(data as unknown as ProfileAddressFields);
}

export function useTeacherAddressSection(
	userId: string,
	initialAddress?: Partial<ProfileAddressFields> | null,
	onUpdate?: () => void,
) {
	const bootstrap = resolveTeacherAddressBootstrap(initialAddress);
	const [form, setForm] = useState<ProfileAddressFormState>(() => bootstrap.form);
	const [loading, setLoading] = useState(bootstrap.loading);
	const [saving, setSaving] = useState(false);
	const addressKey = teacherAddressValueKey(initialAddress);

	useEffect(() => {
		if (addressKey != null) {
			setForm(teacherAddressFormFromValueKey(addressKey));
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
	}, [addressKey, userId]);

	const onSave = async () => {
		const block = resolveTeacherAddressSaveBlock(form);
		if (block.blocked) {
			toast.error(block.message);
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

	return { form, setForm, loading, saving, onSave };
}
