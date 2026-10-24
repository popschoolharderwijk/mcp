import { ProfileAddressFormFields } from '@/components/profile/ProfileAddressFormFields';
import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import { useProfileAddressSection } from '@/components/profile/useProfileAddressSection';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import type { ProfileAddressFields } from '@/types/profile-address';

interface ProfileAddressSectionProps {
	userId: string;
	canEdit: boolean;
	initialAddress?: Partial<ProfileAddressFields> | null;
	onUpdate?: () => void;
	idPrefix?: string;
}

export function ProfileAddressSection({
	userId,
	canEdit,
	initialAddress,
	onUpdate,
	idPrefix = 'profile-address',
}: ProfileAddressSectionProps) {
	const { form, setForm, loading, saving, onSave } = useProfileAddressSection(userId, initialAddress, onUpdate);

	if (loading) return <SectionSkeleton />;

	return (
		<ProfileFormSaveCard title="Adres" saving={saving} onSave={() => void onSave()} canEdit={canEdit}>
			<ProfileAddressFormFields idPrefix={idPrefix} form={form} onChange={setForm} disabled={!canEdit} />
		</ProfileFormSaveCard>
	);
}
