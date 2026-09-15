const SIDEBAR_GROUP_OPEN_STORAGE_PREFIX = 'sidebar:group-open:';

export function sidebarGroupOpenStorageKey(groupKey: string): string {
	return `${SIDEBAR_GROUP_OPEN_STORAGE_PREFIX}${groupKey}`;
}
