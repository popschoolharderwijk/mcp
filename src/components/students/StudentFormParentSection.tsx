import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';

interface StudentFormParentSectionProps {
	vm: StudentFormFieldsViewModel;
	canEdit?: boolean;
}

export function StudentFormParentSection({ vm, canEdit = true }: StudentFormParentSectionProps) {
	const { form, setForm } = vm;

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<Label htmlFor="parent-name">Naam</Label>
					<Input
						id="parent-name"
						value={form.parent_name}
						onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
						placeholder="Jan Jansen"
						disabled={!canEdit}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="parent-email">E-mail</Label>
					<Input
						id="parent-email"
						type="email"
						value={form.parent_email}
						onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
						placeholder="ouder@voorbeeld.nl"
						disabled={!canEdit}
					/>
				</div>
			</div>
			<div className="space-y-1.5">
				<PhoneInput
					id="parent-phone-number"
					label="Telefoonnummer"
					value={form.parent_phone_number}
					onChange={(value) => setForm({ ...form, parent_phone_number: value })}
					disabled={!canEdit}
				/>
			</div>
		</div>
	);
}
