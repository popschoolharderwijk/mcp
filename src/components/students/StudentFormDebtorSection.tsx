import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { applyDebtorSameAsStudentToggle } from '@/lib/students/studentFormFieldsHelpers';

interface StudentFormDebtorSectionProps {
	vm: StudentFormFieldsViewModel;
}

export function StudentFormDebtorSection({ vm }: StudentFormDebtorSectionProps) {
	const { form, setForm } = vm;

	return (
		<div className="space-y-3 border-t pt-3">
			<h3 className="text-sm font-semibold">Debiteurgegevens</h3>
			<label className="flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					id="debtor-same-as-student"
					checked={form.debtor_info_same_as_student}
					onChange={(e) => setForm(applyDebtorSameAsStudentToggle(form, e.target.checked))}
					className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
				/>
				<span className="text-sm font-medium">Debiteurinformatie gelijk aan leerlinginformatie</span>
			</label>
			{!form.debtor_info_same_as_student && (
				<div className="space-y-3 pl-6 border-l-2">
					<div className="space-y-1.5">
						<Label htmlFor="debtor-name">
							Naam <span className="text-destructive">*</span>
						</Label>
						<Input
							id="debtor-name"
							value={form.debtor_name}
							onChange={(e) => setForm({ ...form, debtor_name: e.target.value })}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="debtor-address">
							Adres <span className="text-destructive">*</span>
						</Label>
						<Input
							id="debtor-address"
							value={form.debtor_address}
							onChange={(e) => setForm({ ...form, debtor_address: e.target.value })}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="debtor-postal-code">
								Postcode <span className="text-destructive">*</span>
							</Label>
							<Input
								id="debtor-postal-code"
								value={form.debtor_postal_code}
								onChange={(e) => setForm({ ...form, debtor_postal_code: e.target.value })}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="debtor-city">
								Woonplaats <span className="text-destructive">*</span>
							</Label>
							<Input
								id="debtor-city"
								value={form.debtor_city}
								onChange={(e) => setForm({ ...form, debtor_city: e.target.value })}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
