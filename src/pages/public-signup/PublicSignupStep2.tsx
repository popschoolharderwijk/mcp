import { LessonTypeOptionSelect, type OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { frequencyLabels } from '@/lib/frequencies';
import { isStep2NextDisabled } from '@/lib/signup/publicSignupHelpers';
import type { LessonTypeOptionRow } from '@/types/lesson-agreements';
import { DAY_LABELS, type GroupOption, type LessonType } from './types';

interface PublicSignupStep2Props {
	selectedType: LessonType;
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	lessonTypeOptions: LessonTypeOptionRow[];
	selectedOption: OptionSnapshot | null;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
	onSelectOption: (option: OptionSnapshot | null) => void;
	onPrevious: () => void;
	onNext: () => void;
}

export function PublicSignupStep2({
	selectedType,
	groups,
	selectedGroupId,
	lessonTypeOptions,
	selectedOption,
	onSelectGroupId,
	onSelectOption,
	onPrevious,
	onNext,
}: PublicSignupStep2Props) {
	const nextDisabled = isStep2NextDisabled(
		selectedType.is_group_lesson,
		selectedGroupId,
		lessonTypeOptions.length,
		selectedOption !== null,
	);

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold">
				{selectedType.is_group_lesson ? 'Kies een groep' : 'Kies hoe vaak en hoe lang'}
			</h2>
			{selectedType.is_group_lesson ? (
				<GroupLessonSelection
					groups={groups}
					selectedGroupId={selectedGroupId}
					onSelectGroupId={onSelectGroupId}
				/>
			) : (
				<IndividualLessonSelection
					lessonTypeName={selectedType.name}
					lessonTypeOptions={lessonTypeOptions}
					selectedOption={selectedOption}
					onSelectOption={onSelectOption}
				/>
			)}
			<div className="flex justify-between pt-4">
				<Button variant="outline" onClick={onPrevious}>
					Vorige
				</Button>
				<Button disabled={nextDisabled} onClick={onNext}>
					Volgende
				</Button>
			</div>
		</div>
	);
}

interface GroupLessonSelectionProps {
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
}

function GroupLessonSelection({ groups, selectedGroupId, onSelectGroupId }: GroupLessonSelectionProps) {
	return (
		<div className="space-y-2">
			{groups.length === 0 && <p className="text-sm text-muted-foreground">Geen actieve groepen beschikbaar.</p>}
			{groups.map((group) => (
				<button
					type="button"
					key={group.id}
					onClick={() => onSelectGroupId(group.id)}
					className={`w-full p-4 rounded-lg border-2 text-left transition ${
						selectedGroupId === group.id
							? 'border-primary bg-primary/5'
							: 'border-border hover:border-primary/50'
					}`}
				>
					<div className="font-medium">{group.name}</div>
					<div className="text-sm text-muted-foreground mt-1">
						{DAY_LABELS[group.day_of_week]} {group.start_time.slice(0, 5)} · {group.duration_minutes} min ·{' '}
						{frequencyLabels[group.frequency as keyof typeof frequencyLabels] ?? group.frequency}
					</div>
					<div className="text-sm text-muted-foreground">
						{group.teacher_name ? `Docent: ${group.teacher_name}` : ''} · {group.members_count} deelnemers
					</div>
				</button>
			))}
			<button
				type="button"
				onClick={() => onSelectGroupId('waitlist')}
				className={`w-full p-4 rounded-lg border-2 border-dashed text-left transition ${
					selectedGroupId === 'waitlist'
						? 'border-primary bg-primary/5'
						: 'border-border hover:border-primary/50'
				}`}
			>
				<div className="font-medium">Zet me op de wachtlijst</div>
				<div className="text-sm text-muted-foreground">We nemen contact op zodra een plek beschikbaar is.</div>
			</button>
		</div>
	);
}

interface IndividualLessonSelectionProps {
	lessonTypeName: string;
	lessonTypeOptions: LessonTypeOptionRow[];
	selectedOption: OptionSnapshot | null;
	onSelectOption: (option: OptionSnapshot | null) => void;
}

function IndividualLessonSelection({
	lessonTypeName,
	lessonTypeOptions,
	selectedOption,
	onSelectOption,
}: IndividualLessonSelectionProps) {
	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Je meldt je aan voor individuele {lessonTypeName}-les. Kies hieronder hoe vaak en hoe lang je per les
				wilt komen. De prijs per les wordt direct getoond.
			</p>
			{lessonTypeOptions.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Er zijn nog geen opties ingesteld voor deze les. Vul je gegevens in op de volgende stap; we nemen
					contact op om de details af te stemmen.
				</p>
			) : (
				<div className="space-y-2">
					<Label>Duur, frequentie en prijs</Label>
					<LessonTypeOptionSelect
						options={lessonTypeOptions}
						value={selectedOption}
						onChange={onSelectOption}
					/>
				</div>
			)}
		</div>
	);
}
