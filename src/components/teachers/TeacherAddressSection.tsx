import { ProfileAddressFormFields } from '@/components/profile/ProfileAddressFormFields';
import { useTeacherAddressSection } from '@/components/teachers/useTeacherAddressSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ProfileAddressFields } from '@/types/profile-address';

interface TeacherAddressSectionProps {
	userId: string;
	canEdit: boolean;
	initialAddress?: Partial<ProfileAddressFields> | null;
	onUpdate?: () => void;
}

export function TeacherAddressSection({ userId, canEdit, initialAddress, onUpdate }: TeacherAddressSectionProps) {
	const { form, setForm, loading, saving, onSave } = useTeacherAddressSection(userId, initialAddress, onUpdate);

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
