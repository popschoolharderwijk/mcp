import type { LessonGroupWizardState } from '@/components/lesson-groups/wizard/useLessonGroupWizard';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LessonTypeSelect } from '@/components/ui/lesson-type-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { frequencyOptions } from '@/lib/frequencies';

interface LessonGroupBasicsStepProps {
	wizard: LessonGroupWizardState;
}

export function LessonGroupBasicsStep({ wizard }: LessonGroupBasicsStepProps) {
	const { form, formUpdaters, lessonTypes } = wizard;

	return (
		<div className="space-y-4 py-2">
			<div>
				<Label htmlFor="lg-name">Naam van de groep</Label>
				<Input
					id="lg-name"
					value={form.name}
					onChange={(e) => formUpdaters.setName(e.target.value)}
					placeholder="Bijv. Bandklas vrijdag"
				/>
			</div>
			<div>
				<Label>Lessoort (groepsles)</Label>
				<LessonTypeSelect
					options={lessonTypes}
					value={form.lessonTypeId}
					onChange={formUpdaters.setLessonTypeId}
					placeholder={
						lessonTypes.length === 0
							? 'Geen groepslessen beschikbaar — maak eerst een groep-lessoort aan'
							: 'Selecteer lessoort...'
					}
				/>
			</div>
			<div className="grid grid-cols-3 gap-4">
				<div>
					<Label>Duur (min)</Label>
					<Input
						type="number"
						min={5}
						value={form.durationMinutes}
						onChange={(e) => formUpdaters.setDurationMinutes(Number(e.target.value) || 0)}
					/>
				</div>
				<div>
					<Label>Frequentie</Label>
					<Select
						value={form.frequency}
						onValueChange={(v) => formUpdaters.setFrequency(v as typeof form.frequency)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{frequencyOptions.map((f) => (
								<SelectItem key={f.value} value={f.value}>
									{f.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="lg-start">Startdatum</Label>
					<DatePicker id="lg-start" value={form.startDate} onChange={formUpdaters.setStartDate} />
				</div>
				<div>
					<Label htmlFor="lg-end">Einddatum</Label>
					<DatePicker id="lg-end" value={form.endDate} onChange={formUpdaters.setEndDate} />
				</div>
			</div>
		</div>
	);
}
