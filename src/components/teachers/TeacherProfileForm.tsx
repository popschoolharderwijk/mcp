import { TeacherProfileCocFields } from '@/components/teachers/TeacherProfileCocFields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import {
	canSubmitTeacherProfileForm,
	type TeacherProfileFormValues,
} from '@/lib/teachers/teacherProfileSectionHelpers';

interface TeacherProfileFormProps {
	form: TeacherProfileFormValues;
	canEdit: boolean;
	saving: boolean;
	cocIssuedOnDraftSynced?: boolean;
	onChange: (patch: Partial<TeacherProfileFormValues>) => void;
	onCocIssuedOnDraftSyncedChange?: (synced: boolean) => void;
	onSave: () => void;
}

export function TeacherProfileForm({
	form,
	canEdit,
	saving,
	cocIssuedOnDraftSynced = true,
	onChange,
	onCocIssuedOnDraftSyncedChange,
	onSave,
}: TeacherProfileFormProps) {
	const canSubmit = canSubmitTeacherProfileForm(canEdit, form, cocIssuedOnDraftSynced);

	return (
		<div className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="first-name">Voornaam</Label>
					<Input
						id="first-name"
						value={form.firstName}
						onChange={(e) => onChange({ firstName: e.target.value })}
						disabled={!canEdit}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="last-name">Achternaam</Label>
					<Input
						id="last-name"
						value={form.lastName}
						onChange={(e) => onChange({ lastName: e.target.value })}
						disabled={!canEdit}
					/>
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="teacher-email">Email</Label>
					<Input id="teacher-email" type="email" value={form.email} disabled />
					{canEdit && <p className="text-xs text-muted-foreground">Email kan niet worden gewijzigd.</p>}
				</div>
				<PhoneInput
					id="phone-number"
					label="Telefoonnummer"
					value={form.phoneNumber}
					onChange={(phoneNumber) => onChange({ phoneNumber })}
					disabled={!canEdit}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="bio">Biografie</Label>
				<Textarea
					id="bio"
					value={form.bio}
					onChange={(e) => onChange({ bio: e.target.value })}
					placeholder="Korte beschrijving van jezelf..."
					rows={3}
					disabled={!canEdit}
					className="resize-none"
				/>
			</div>
			<TeacherProfileCocFields
				form={form}
				canEdit={canEdit}
				onChange={onChange}
				onCocIssuedOnDraftSyncedChange={onCocIssuedOnDraftSyncedChange}
			/>
			{canEdit && (
				<SubmitButton
					onClick={onSave}
					loading={saving}
					disabled={!canSubmit}
					size="sm"
					loadingLabel="Opslaan..."
				>
					Opslaan
				</SubmitButton>
			)}
		</div>
	);
}
