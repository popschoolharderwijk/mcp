import { useState } from 'react';
import { LuCheck, LuChevronDown } from 'react-icons/lu';
import { useAgendaLessonTypeFilter } from '@/components/agenda/AgendaLessonTypeFilterContext';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	AGENDA_LESSON_TYPE_FILTER_ALL,
	AGENDA_LESSON_TYPE_FILTER_VALUE_ALL,
	AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS,
	type AgendaLessonTypeFilterOption,
	type AgendaLessonTypeFilterSelection,
	agendaLessonTypeFilterSelectionToValue,
	resolveAgendaLessonTypeFilterSelection,
} from '@/lib/agenda/agendaLessonTypeFilterHelpers';
import { cn } from '@/lib/utils';

function fixedSelectionLabel(selection: AgendaLessonTypeFilterSelection): string | null {
	if (selection.kind === 'all') return 'Alle afspraken';
	if (selection.kind === 'non-lessons') return 'Alle afspraken behalve lessen';
	return null;
}

function TriggerLabel({
	selection,
	options,
}: {
	selection: AgendaLessonTypeFilterSelection;
	options: AgendaLessonTypeFilterOption[];
}) {
	const fixedLabel = fixedSelectionLabel(selection);
	if (fixedLabel) return <span className="truncate">{fixedLabel}</span>;
	if (selection.kind !== 'lesson-type') return <span className="truncate">Alle afspraken</span>;

	const option = options.find((item) => item.id === selection.lessonTypeId);
	if (!option) return <span className="truncate">Alle afspraken</span>;
	return <LessonTypeBadge lessonType={option} size="sm" />;
}
/** Toolbar select: all appointments, non-lessons only, or a single lesson type. */
export function AgendaLessonTypeFilter() {
	const filter = useAgendaLessonTypeFilter();
	const [open, setOpen] = useState(false);

	if (!filter || filter.options.length === 0) return null;

	const { options, selection, onSelect } = filter;
	const effectiveSelection = resolveAgendaLessonTypeFilterSelection(selection, options);
	const value = agendaLessonTypeFilterSelectionToValue(effectiveSelection);

	const selectAndClose = (next: AgendaLessonTypeFilterSelection) => {
		onSelect(next);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					role="combobox"
					aria-expanded={open}
					aria-label="Filter afspraken"
					title="Filter afspraken"
					data-tip-target="agenda-lesson-type-filter"
					className="rbc-toolbar-filter-select shrink-0 font-normal"
				>
					<div className="flex min-w-0 items-center overflow-hidden">
						<TriggerLabel selection={effectiveSelection} options={options} />
					</div>
					<LuChevronDown className="h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0" align="end">
				<Command shouldFilter={false}>
					<CommandList>
						<CommandEmpty>Geen opties</CommandEmpty>
						<CommandGroup>
							<CommandItem
								value={AGENDA_LESSON_TYPE_FILTER_VALUE_ALL}
								onSelect={() => selectAndClose(AGENDA_LESSON_TYPE_FILTER_ALL)}
							>
								<LuCheck
									className={cn(
										'mr-2 h-4 w-4 shrink-0',
										value === AGENDA_LESSON_TYPE_FILTER_VALUE_ALL ? 'opacity-100' : 'opacity-0',
									)}
								/>
								Alle afspraken
							</CommandItem>
							<CommandItem
								value={AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS}
								onSelect={() => selectAndClose({ kind: 'non-lessons' })}
							>
								<LuCheck
									className={cn(
										'mr-2 h-4 w-4 shrink-0',
										value === AGENDA_LESSON_TYPE_FILTER_VALUE_NON_LESSONS
											? 'opacity-100'
											: 'opacity-0',
									)}
								/>
								Alle afspraken behalve lessen
							</CommandItem>
						</CommandGroup>
						<CommandGroup heading="Lessoorten">
							{options.map((option) => {
								const isSelected = value === option.id;
								return (
									<CommandItem
										key={option.id}
										value={option.id}
										onSelect={() =>
											selectAndClose({ kind: 'lesson-type', lessonTypeId: option.id })
										}
									>
										<LuCheck
											className={cn(
												'mr-2 h-4 w-4 shrink-0',
												isSelected ? 'opacity-100' : 'opacity-0',
											)}
										/>
										<LessonTypeBadge lessonType={option} size="sm" className="flex-1" />
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
