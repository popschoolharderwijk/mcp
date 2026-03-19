import { useCallback, useEffect, useState } from 'react';
import { LuCalendarPlus, LuLoaderCircle, LuRepeat } from 'react-icons/lu';
import { AgendaEventFormDialog } from '@/components/agenda/AgendaEventFormDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { formatTime } from '@/lib/time/time-format';
import type { AgendaEventRow } from '@/types/agenda-events';

interface ProjectAgendaEventsProps {
	projectId: string;
	canSchedule: boolean;
}

export function ProjectAgendaEvents({ projectId, canSchedule }: ProjectAgendaEventsProps) {
	const [events, setEvents] = useState<AgendaEventRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [editEvent, setEditEvent] = useState<AgendaEventRow | null>(null);
	const [scheduleOpen, setScheduleOpen] = useState(false);

	const loadEvents = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from('agenda_events')
			.select('*')
			.eq('source_type', 'project')
			.eq('source_id', projectId)
			.order('start_date', { ascending: true })
			.order('start_time', { ascending: true });

		if (error) {
			console.error('Error loading project appointments:', error);
		}
		setEvents(data ?? []);
		setLoading(false);
	}, [projectId]);

	useEffect(() => {
		loadEvents();
	}, [loadEvents]);

	const handleSuccess = useCallback(() => {
		setEditEvent(null);
		setScheduleOpen(false);
		loadEvents();
	}, [loadEvents]);

	if (loading) {
		return (
			<div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
				<LuLoaderCircle className="h-4 w-4 animate-spin" />
				Afspraken laden…
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-medium text-muted-foreground">Afspraken ({events.length})</h4>
				{canSchedule && (
					<Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
						<LuCalendarPlus className="mr-1.5 h-3.5 w-3.5" />
						Afspraak plannen
					</Button>
				)}
			</div>

			{events.length === 0 ? (
				<p className="text-sm text-muted-foreground py-1">Geen afspraken ingepland.</p>
			) : (
				<div className="divide-y rounded-md border">
					{events.map((event) => (
						<button
							key={event.id}
							type="button"
							className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
							onClick={() => setEditEvent(event)}
						>
							<span className="font-medium min-w-[90px]">{formatDbDateToUi(event.start_date)}</span>
							<span className="text-muted-foreground min-w-[90px]">
								{formatTime(event.start_time)}
								{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
							</span>
							<span className="flex-1 truncate">{event.title}</span>
							{event.recurring && (
								<Badge variant="secondary" className="gap-1">
									<LuRepeat className="h-3 w-3" />
									Terugkerend
								</Badge>
							)}
						</button>
					))}
				</div>
			)}

			{/* Edit existing event */}
			<AgendaEventFormDialog
				open={!!editEvent}
				onOpenChange={(open) => {
					if (!open) setEditEvent(null);
				}}
				event={editEvent}
				onSuccess={handleSuccess}
			/>

			{/* Schedule new event for this project */}
			<AgendaEventFormDialog
				open={scheduleOpen}
				onOpenChange={(open) => {
					if (!open) setScheduleOpen(false);
				}}
				initialProjectId={projectId}
				onSuccess={handleSuccess}
			/>
		</div>
	);
}
