import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';
import { DateOfBirthPicker } from '@/components/ui/date-of-birth-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';

interface StudentFormPersonalSectionProps {
	vm: StudentFormFieldsViewModel;
	onDateOfBirthDraftSyncedChange?: (synced: boolean) => void;
}

export function StudentFormPersonalSection({ vm, onDateOfBirthDraftSyncedChange }: StudentFormPersonalSectionProps) {
	const { form, setForm, isEditMode } = vm;

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<Label htmlFor="student-first-name">Voornaam</Label>
					<Input
						id="student-first-name"
						value={form.first_name}
						onChange={(e) => setForm({ ...form, first_name: e.target.value })}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="student-last-name">Achternaam</Label>
					<Input
						id="student-last-name"
						value={form.last_name}
						onChange={(e) => setForm({ ...form, last_name: e.target.value })}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<Label htmlFor="student-email">Email</Label>
					<Input
						id="student-email"
						type="email"
						value={form.email}
						onChange={(e) => setForm({ ...form, email: e.target.value })}
						placeholder="leerling@voorbeeld.nl"
						disabled
					/>
					{isEditMode && <p className="text-xs text-muted-foreground">Email kan niet worden gewijzigd.</p>}
				</div>
				<div className="space-y-1.5">
					<PhoneInput
						id="student-phone-number"
						label="Telefoonnummer"
						value={form.phone_number}
						onChange={(value) => setForm({ ...form, phone_number: value })}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="student-dob">Geboortedatum</Label>
					<DateOfBirthPicker
						id="student-dob"
						value={form.date_of_birth}
						onChange={(value) => setForm({ ...form, date_of_birth: value })}
						onDraftSyncedChange={onDateOfBirthDraftSyncedChange}
					/>
				</div>
			</div>
		</div>
	);
}
