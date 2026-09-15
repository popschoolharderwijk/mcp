import { useEffect, useState } from 'react';
import { sidebarGroupOpenStorageKey } from '@/lib/layout/sidebarGroupStorageHelpers';

function readStoredOpen(storageKey: string): boolean {
	if (typeof window === 'undefined') return false;
	return window.localStorage.getItem(storageKey) === '1';
}

function persistOpen(storageKey: string, open: boolean): void {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(storageKey, open ? '1' : '0');
}

export function usePersistedSidebarGroupOpen(groupKey: string, forceOpen: boolean) {
	const storageKey = sidebarGroupOpenStorageKey(groupKey);
	const [open, setOpen] = useState(() => readStoredOpen(storageKey));

	useEffect(() => {
		if (forceOpen) setOpen(true);
	}, [forceOpen]);

	useEffect(() => {
		persistOpen(storageKey, open);
	}, [storageKey, open]);

	return [open, setOpen] as const;
}
