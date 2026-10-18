import { AgendaCalendarPanel } from '@/components/agenda/AgendaCalendarPanel';
import { AgendaViewDialogs } from '@/components/agenda/AgendaViewDialogs';
import { useAgendaViewController } from '@/components/agenda/useAgendaViewController';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

export interface AgendaViewProps {
	userId?: string;
	canEdit?: boolean;
}

export function AgendaView(props: AgendaViewProps = {}) {
	const { ui, derived, handlers, calendarProps, loading, canEdit, canManageAgenda, user } =
		useAgendaViewController(props);

	if (loading) return <PageSkeleton variant="agenda" />;

	return (
		<div className="flex flex-col gap-4 h-[calc(100vh-112px)] min-h-[640px]">
			<AgendaCalendarPanel
				calendarProps={calendarProps}
				currentView={ui.currentView}
				currentDate={ui.currentDate}
				isFullscreen={ui.isFullscreen}
				onFullscreenChange={ui.setIsFullscreen}
			/>
			<AgendaViewDialogs
				ui={ui}
				derived={derived}
				canEdit={canEdit}
				canManageAgenda={canManageAgenda}
				user={user}
				reloadAgenda={handlers.reloadAgenda}
				handleEventDrop={handlers.handleEventDrop}
				handleCancelLesson={handlers.handleCancelLesson}
			/>
		</div>
	);
}
