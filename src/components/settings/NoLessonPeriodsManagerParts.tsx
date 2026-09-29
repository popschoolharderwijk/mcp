import type { ComponentProps } from 'react';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { CrudFormDialogActions } from '@/components/ui/crud-form-dialog-actions';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDbDateToUi } from '@/lib/date/date-format';
import {
	resolveNoLessonPeriodEditorDialogTitle,
	shouldShowNoLessonPeriodEndDateError,
} from '@/lib/settings/noLessonPeriodEditorHelpers';
import type { NoLessonPeriodListItem } from '@/lib/settings/noLessonPeriodsManagerControllerHelpers';

interface NoLessonPeriodFormState {
	name: string;
	start_date: string;
	end_date: string;
	description: string;
}

interface NoLessonPeriodsListProps {
	periods: NoLessonPeriodListItem[];
	onEdit: (period: NoLessonPeriodListItem) => void;
	onDelete: (period: NoLessonPeriodListItem) => void;
}

export function NoLessonPeriodsList({ periods, onEdit, onDelete }: NoLessonPeriodsListProps) {
	return (
		<ul className="divide-y divide-border">
			{periods.map((period) => (
				<li key={period.id} className="flex items-center justify-between gap-3 py-3">
					<div className="min-w-0 flex-1">
						<p className="font-medium truncate">{period.name}</p>
						<p className="text-sm text-muted-foreground">
							{formatDbDateToUi(period.start_date)} t/m {formatDbDateToUi(period.end_date)}
						</p>
						{period.description && (
							<p className="text-xs text-muted-foreground mt-0.5 truncate">{period.description}</p>
						)}
					</div>
					<div className="flex shrink-0 gap-1">
						<Button variant="ghost" size="icon" onClick={() => onEdit(period)} aria-label="Bewerken">
							<LuPencil className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-destructive hover:text-destructive"
							onClick={() => onDelete(period)}
							aria-label="Verwijderen"
						>
							<LuTrash2 className="h-4 w-4" />
						</Button>
					</div>
				</li>
			))}
		</ul>
	);
}

interface NoLessonPeriodEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editing: NoLessonPeriodListItem | null;
	form: NoLessonPeriodFormState;
	onFormChange: (form: NoLessonPeriodFormState) => void;
	dialogActions: ComponentProps<typeof CrudFormDialogActions>;
}

export function NoLessonPeriodEditorDialog({
	open,
	onOpenChange,
	editing,
	form,
	onFormChange,
	dialogActions,
}: NoLessonPeriodEditorDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{resolveNoLessonPeriodEditorDialogTitle(editing)}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="period-name">Naam</Label>
						<Input
							id="period-name"
							value={form.name}
							onChange={(event) => onFormChange({ ...form, name: event.target.value })}
							placeholder="Bijv. Kerstvakantie 2025"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="period-start">Startdatum</Label>
							<DatePicker
								id="period-start"
								value={form.start_date || null}
								onChange={(value) => onFormChange({ ...form, start_date: value ?? '' })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="period-end">Einddatum</Label>
							<DatePicker
								id="period-end"
								value={form.end_date || null}
								onChange={(value) => onFormChange({ ...form, end_date: value ?? '' })}
							/>
						</div>
					</div>
					{shouldShowNoLessonPeriodEndDateError(form.start_date, form.end_date) && (
						<p className="text-xs text-destructive">Einddatum moet op of na startdatum liggen.</p>
					)}
					<div className="space-y-2">
						<Label htmlFor="period-description">Beschrijving (optioneel)</Label>
						<Textarea
							id="period-description"
							value={form.description}
							onChange={(event) => onFormChange({ ...form, description: event.target.value })}
							rows={2}
						/>
					</div>
				</div>
				<CrudFormDialogActions {...dialogActions} />
			</DialogContent>
		</Dialog>
	);
}
