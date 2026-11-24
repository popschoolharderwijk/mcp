import type { ReactNode } from 'react';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';
import { DateOfBirthField } from '@/components/ui/date-of-birth-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MailtoEmailField } from '@/components/ui/mailto-email-field';
import { PhoneInput } from '@/components/ui/phone-input';

interface StudentFormPersonalSectionProps {
	vm: StudentFormFieldsViewModel;
	avatar?: ReactNode;
	canEdit?: boolean;
	onDateOfBirthDraftSyncedChange?: (synced: boolean) => void;
}

export function StudentFormPersonalSection({
	vm,
	avatar,
	canEdit = true,
	onDateOfBirthDraftSyncedChange,
}: StudentFormPersonalSectionProps) {
	const { form, setForm } = vm;

	const nameAndContactFields = (
		<div className="min-w-0 flex-1 space-y-3">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<Label htmlFor="student-first-name">Voornaam</Label>
					<Input
						id="student-first-name"
						value={form.first_name}
						onChange={(e) => setForm({ ...form, first_name: e.target.value })}
						disabled={!canEdit}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="student-last-name">Achternaam</Label>
					<Input
						id="student-last-name"
						value={form.last_name}
						onChange={(e) => setForm({ ...form, last_name: e.target.value })}
						disabled={!canEdit}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<MailtoEmailField id="student-email" email={form.email} className="space-y-1.5" />
				<DateOfBirthField
					id="student-dob"
					value={form.date_of_birth}
					onChange={(value) => setForm({ ...form, date_of_birth: value })}
					onDraftSyncedChange={onDateOfBirthDraftSyncedChange}
					disabled={!canEdit}
				/>
			</div>
			<PhoneInput
				id="student-phone-number"
				label="Telefoonnummer"
				value={form.phone_number}
				onChange={(value) => setForm({ ...form, phone_number: value })}
				disabled={!canEdit}
			/>
		</div>
	);

	return (
		<div className="space-y-3">
			{avatar ? (
				<div className="flex items-start gap-4">
					{avatar}
					{nameAndContactFields}
				</div>
			) : (
				nameAndContactFields
			)}
		</div>
	);
}
