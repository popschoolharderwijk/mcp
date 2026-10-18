import { createContext, useContext } from 'react';

export interface AgendaFullscreenContextValue {
	isFullscreen: boolean;
	toggleFullscreen: () => void;
}

const AgendaFullscreenContext = createContext<AgendaFullscreenContextValue | null>(null);

export function useAgendaFullscreen(): AgendaFullscreenContextValue | null {
	return useContext(AgendaFullscreenContext);
}

export const AgendaFullscreenProvider = AgendaFullscreenContext.Provider;
