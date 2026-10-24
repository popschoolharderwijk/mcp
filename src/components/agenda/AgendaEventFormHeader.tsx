import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';

interface AgendaEventFormHeaderIconProps {
	isLesson: boolean;
	lessonType?: { name: string; icon?: string | null; color?: string | null } | null;
	color: string | null;
	setColor: (value: string | null) => void;
	isCancelledEvent: boolean;
}

function AgendaEventFormHeaderIcon({
	isLesson,
	lessonType,
	color,
	setColor,
	isCancelledEvent,
}: AgendaEventFormHeaderIconProps) {
	if (isLesson) {
		return (
			<LessonTypeBadge
				lessonType={lessonType ?? { name: '', icon: null, color }}
				size="lg"
				showName={false}
				showTooltip={false}
			/>
		);
	}

	return (
		<ColorPicker value={color || undefined} onChange={(hex) => setColor(hex)} compact disabled={isCancelledEvent} />
	);
}

interface AgendaEventFormHeaderTitleProps {
	isLesson: boolean;
	title: string;
	setTitle: (value: string) => void;
	isCancelledEvent: boolean;
	isNewEvent: boolean;
}

function AgendaEventFormHeaderTitle({
	isLesson,
	title,
	setTitle,
	isCancelledEvent,
	isNewEvent,
}: AgendaEventFormHeaderTitleProps) {
	if (isLesson) {
		return <span className="flex-1 text-lg font-medium">{title}</span>;
	}

	return (
		<Input
			id="title"
			value={title}
			onChange={(event) => setTitle(event.target.value)}
			placeholder="Titel toevoegen"
			disabled={isCancelledEvent}
			className="flex-1 border-0 border-b rounded-none px-0 text-lg font-medium focus-visible:ring-0 focus-visible:border-primary"
			required
			autoFocus={isNewEvent}
		/>
	);
}

interface AgendaEventFormHeaderProps {
	isLessonEvent: boolean;
	isLessonGroupEvent: boolean;
	lessonType?: { name: string; icon?: string | null; color?: string | null } | null;
	color: string | null;
	setColor: (value: string | null) => void;
	title: string;
	setTitle: (value: string) => void;
	isCancelledEvent: boolean;
	isNewEvent: boolean;
}

function isAgendaLessonFormHeader(isLessonEvent: boolean, isLessonGroupEvent: boolean): boolean {
	return isLessonEvent || isLessonGroupEvent;
}

export function AgendaEventFormHeader({
	isLessonEvent,
	isLessonGroupEvent,
	lessonType,
	color,
	setColor,
	title,
	setTitle,
	isCancelledEvent,
	isNewEvent,
}: AgendaEventFormHeaderProps) {
	const isLesson = isAgendaLessonFormHeader(isLessonEvent, isLessonGroupEvent);

	return (
		<div className="flex items-center gap-3">
			<AgendaEventFormHeaderIcon
				isLesson={isLesson}
				lessonType={lessonType}
				color={color}
				setColor={setColor}
				isCancelledEvent={isCancelledEvent}
			/>
			<AgendaEventFormHeaderTitle
				isLesson={isLesson}
				title={title}
				setTitle={setTitle}
				isCancelledEvent={isCancelledEvent}
				isNewEvent={isNewEvent}
			/>
		</div>
	);
}
