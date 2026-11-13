import type { RoomVisibility } from '@/types/rooms';

const ROOM_VISIBILITY_LABELS: Record<RoomVisibility, string> = {
	public: 'Publiek',
	internal: 'Intern',
	hidden: 'Verborgen',
};

export function canManageRooms(isAdmin: boolean, isSiteAdmin: boolean): boolean {
	return isAdmin || isSiteAdmin;
}

export function roomVisibilityLabel(visibility: RoomVisibility): string {
	return ROOM_VISIBILITY_LABELS[visibility];
}

export function roomVisibilityBadgeVariant(visibility: RoomVisibility): 'default' | 'secondary' | 'outline' {
	if (visibility === 'public') return 'default';
	if (visibility === 'internal') return 'secondary';
	return 'outline';
}
