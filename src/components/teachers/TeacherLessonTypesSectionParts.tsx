import { LuPlus, LuX } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TeacherLessonTypeOption {
	id: string;
	name: string;
	icon: string;
	color: string;
}

interface TeacherLessonTypesAddPopoverProps {
	open: boolean;
	saving: boolean;
	availableLessonTypes: TeacherLessonTypeOption[];
	onOpenChange: (open: boolean) => void;
	onAddLessonType: (lessonTypeId: string) => void;
}

function TeacherLessonTypesAddPopover({
	open,
	saving,
	availableLessonTypes,
	onOpenChange,
	onAddLessonType,
}: TeacherLessonTypesAddPopoverProps) {
	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" disabled={saving}>
					{saving ? (
						<LoadingSpinner size="md" label="Toevoegen" />
					) : (
						<>
							<LuPlus className="mr-2 h-4 w-4" />
							Toevoegen
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-2" align="end">
				<div className="space-y-1">
					{availableLessonTypes.map((lessonType) => (
						<Button
							key={lessonType.id}
							variant="ghost"
							className="w-full justify-start font-normal"
							onClick={() => onAddLessonType(lessonType.id)}
						>
							<LessonTypeBadge lessonType={lessonType} size="sm" />
						</Button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

interface TeacherLessonTypesSectionBodyProps {
	lessonTypes: TeacherLessonTypeOption[];
	canEdit: boolean;
	saving: boolean;
	addPopoverOpen: boolean;
	availableLessonTypes: TeacherLessonTypeOption[];
	onAddPopoverOpenChange: (open: boolean) => void;
	onAddLessonType: (lessonTypeId: string) => void;
	onRemoveLessonType: (lessonTypeId: string) => void;
}

function shouldShowTeacherLessonTypesAddPopover(canEdit: boolean, availableLessonTypeCount: number): boolean {
	return canEdit && availableLessonTypeCount > 0;
}

export function TeacherLessonTypesSectionBody({
	lessonTypes,
	canEdit,
	saving,
	addPopoverOpen,
	availableLessonTypes,
	onAddPopoverOpenChange,
	onAddLessonType,
	onRemoveLessonType,
}: TeacherLessonTypesSectionBodyProps) {
	const showAddPopover = shouldShowTeacherLessonTypesAddPopover(canEdit, availableLessonTypes.length);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-lg">Huidige lessoorten</CardTitle>
				{showAddPopover && (
					<TeacherLessonTypesAddPopover
						open={addPopoverOpen}
						saving={saving}
						availableLessonTypes={availableLessonTypes}
						onOpenChange={onAddPopoverOpenChange}
						onAddLessonType={onAddLessonType}
					/>
				)}
			</CardHeader>
			<CardContent>
				{lessonTypes.length === 0 ? (
					<p className="text-sm text-muted-foreground">Geen lessoorten toegewezen</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{lessonTypes.map((lessonType) => (
							<div key={lessonType.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5">
								<LessonTypeBadge lessonType={lessonType} />
								{canEdit && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-5 w-5 text-muted-foreground hover:text-destructive"
										onClick={() => onRemoveLessonType(lessonType.id)}
										disabled={saving}
									>
										<LuX className="h-3 w-3" />
									</Button>
								)}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
