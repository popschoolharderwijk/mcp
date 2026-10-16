import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { pastDatePickerRange } from '@/lib/date/datePickerHelpers';
import type { TeacherProfileFormValues } from '@/lib/teachers/teacherProfileSectionHelpers';

interface TeacherProfileCocFieldsProps {
	form: TeacherProfileFormValues;
	canEdit: boolean;
	onChange: (patch: Partial<TeacherProfileFormValues>) => void;
	onCocIssuedOnDraftSyncedChange?: (synced: boolean) => void;
}

export function TeacherProfileCocFields({
	form,
	canEdit,
	onChange,
	onCocIssuedOnDraftSyncedChange,
}: TeacherProfileCocFieldsProps) {
	return (
		<div className="space-y-3">
			<label className="flex items-center gap-2 cursor-pointer">
				<input
					id="has-coc"
					type="checkbox"
					checked={form.hasCoc}
					onChange={(e) => onChange({ hasCoc: e.target.checked })}
					disabled={!canEdit}
					className="h-4 w-4 rounded border-input"
				/>
				<span className="text-sm font-medium">VOG aanwezig</span>
			</label>
			{form.hasCoc && (
				<div className="space-y-2">
					<Label htmlFor="coc-issued-on">
						Afgiftedatum <span className="text-destructive">*</span>
					</Label>
					<DatePicker
						variant="input"
						id="coc-issued-on"
						value={form.cocIssuedOn || null}
						onChange={(value) => onChange({ cocIssuedOn: value ?? '' })}
						onDraftSyncedChange={onCocIssuedOnDraftSyncedChange}
						disabled={!canEdit}
						className="max-w-xs"
						{...pastDatePickerRange()}
						calendarAriaLabel="Kies afgiftedatum"
					/>
				</div>
			)}
		</div>
	);
}
