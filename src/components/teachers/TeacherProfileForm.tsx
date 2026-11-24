import type { ReactNode } from 'react';
import { TeacherProfileCocFields } from '@/components/teachers/TeacherProfileCocFields';
import { DateOfBirthField } from '@/components/ui/date-of-birth-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MailtoEmailField } from '@/components/ui/mailto-email-field';
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
	hasChanges: boolean;
	avatar?: ReactNode;
	cocIssuedOnDraftSynced?: boolean;
	dateOfBirthDraftSynced?: boolean;
	onChange: (patch: Partial<TeacherProfileFormValues>) => void;
	onCocIssuedOnDraftSyncedChange?: (synced: boolean) => void;
	onDateOfBirthDraftSyncedChange?: (synced: boolean) => void;
	onSave: () => void;
}

export function TeacherProfileForm({
	form,
	canEdit,
	saving,
	hasChanges,
	avatar,
	cocIssuedOnDraftSynced = true,
	dateOfBirthDraftSynced = true,
	onChange,
	onCocIssuedOnDraftSyncedChange,
	onDateOfBirthDraftSyncedChange,
	onSave,
}: TeacherProfileFormProps) {
	const canSubmit = canSubmitTeacherProfileForm(
		canEdit,
		form,
		cocIssuedOnDraftSynced,
		dateOfBirthDraftSynced,
		hasChanges,
	);

	const nameAndContactFields = (
		<div className="min-w-0 flex-1 space-y-4">
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
				<MailtoEmailField id="teacher-email" email={form.email} />
				<DateOfBirthField
					id="teacher-dob"
					value={form.dateOfBirth}
					onChange={(dateOfBirth) => onChange({ dateOfBirth })}
					onDraftSyncedChange={onDateOfBirthDraftSyncedChange}
					disabled={!canEdit}
				/>
			</div>
			<PhoneInput
				id="phone-number"
				label="Telefoonnummer"
				value={form.phoneNumber}
				onChange={(phoneNumber) => onChange({ phoneNumber })}
				disabled={!canEdit}
			/>
		</div>
	);

	return (
		<div className="space-y-4">
			{avatar ? (
				<div className="flex items-start gap-4">
					{avatar}
					{nameAndContactFields}
				</div>
			) : (
				nameAndContactFields
			)}
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
