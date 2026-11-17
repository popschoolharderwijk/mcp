import { createContext, useContext } from 'react';
import type {
	AgendaLessonTypeFilterOption,
	AgendaLessonTypeFilterSelection,
} from '@/lib/agenda/agendaLessonTypeFilterHelpers';

export interface AgendaLessonTypeFilterContextValue {
	options: AgendaLessonTypeFilterOption[];
	selection: AgendaLessonTypeFilterSelection;
	onSelect: (selection: AgendaLessonTypeFilterSelection) => void;
}

const AgendaLessonTypeFilterContext = createContext<AgendaLessonTypeFilterContextValue | null>(null);

export function useAgendaLessonTypeFilter(): AgendaLessonTypeFilterContextValue | null {
	return useContext(AgendaLessonTypeFilterContext);
}

export const AgendaLessonTypeFilterProvider = AgendaLessonTypeFilterContext.Provider;
