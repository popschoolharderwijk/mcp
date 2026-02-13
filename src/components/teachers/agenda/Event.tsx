import { LuBan, LuTriangleAlert } from 'react-icons/lu';
import type { CalendarEvent } from './types';

interface AgendaEventProps {
	event: CalendarEvent;
	title: React.ReactNode;
}

export function AgendaEvent({ event, title }: AgendaEventProps) {
	const { isDeviation, isCancelled } = event.resource;

	return (
		<div className="h-full w-full overflow-hidden relative">
			{isCancelled && <LuBan className="absolute top-0.5 right-0.5 h-3 w-3 text-white drop-shadow-md z-10" />}
			{isDeviation && !isCancelled && (
				<LuTriangleAlert className="absolute top-0.5 right-0.5 h-3 w-3 text-white drop-shadow-md z-10" />
			)}
			<span className={`text-xs leading-tight ${isCancelled ? 'line-through' : ''}`}>{title}</span>
		</div>
	);
}
