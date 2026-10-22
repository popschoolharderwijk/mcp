import type { Dispatch, SetStateAction } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PriceInput } from '@/components/ui/price-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { frequencyOptions } from '@/lib/frequencies';
import { DURATION_OPTIONS } from '@/pages/lesson-type-info/constants';
import {
	updateOptionModalDuration,
	updateOptionModalFrequency,
	updateOptionModalPriceAdult,
	updateOptionModalPriceYouth,
} from '@/pages/lesson-type-info/optionModalFormHelpers';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';
import type { LessonFrequency } from '@/types/lesson-agreements';

interface LessonTypeOptionEditDialogProps {
	editingOption: OptionRowWithKey;
	onClose: () => void;
	optionModalForm: OptionModalFormState;
	setOptionModalForm: Dispatch<SetStateAction<OptionModalFormState>>;
	onSave: () => void;
	saving: boolean;
}

export function LessonTypeOptionEditDialog({
	editingOption,
	onClose,
	optionModalForm,
	setOptionModalForm,
	onSave,
	saving,
}: LessonTypeOptionEditDialogProps) {
	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{editingOption.id ? 'Optie bewerken' : 'Optie toevoegen'}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label>Duur (min)</Label>
						<Select
							value={optionModalForm.duration_minutes}
							onValueChange={(value) =>
								setOptionModalForm((prev) => updateOptionModalDuration(prev, value))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DURATION_OPTIONS.map((duration) => (
									<SelectItem key={duration} value={String(duration)}>
										{duration}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Frequentie</Label>
						<Select
							value={optionModalForm.frequency}
							onValueChange={(value) =>
								setOptionModalForm((prev) => updateOptionModalFrequency(prev, value as LessonFrequency))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{frequencyOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Prijs per les jongeren (€)</Label>
							<PriceInput
								value={optionModalForm.price_per_lesson_youth}
								onChange={(e) =>
									setOptionModalForm((prev) => updateOptionModalPriceYouth(prev, e.target.value))
								}
								className="h-10"
							/>
						</div>
						<div className="space-y-2">
							<Label>Prijs per les volwassenen (€)</Label>
							<PriceInput
								value={optionModalForm.price_per_lesson_adult}
								onChange={(e) =>
									setOptionModalForm((prev) => updateOptionModalPriceAdult(prev, e.target.value))
								}
								className="h-10"
							/>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Annuleren
					</Button>
					<Button onClick={onSave} disabled={saving}>
						{saving ? (
							<>
								<LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />
								Opslaan...
							</>
						) : (
							'Opslaan'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
