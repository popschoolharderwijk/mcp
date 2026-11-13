export const AGREEMENT_MAIL_UNKNOWN_ROOM = 'onbekend';

export function agreementRoomDisplayLabel(roomName: string | null | undefined): string {
	const name = roomName?.trim() ?? '';
	if (!name) return AGREEMENT_MAIL_UNKNOWN_ROOM;
	return name;
}

export function agreementRoomNameFromJoin(rooms: { name: string } | { name: string }[] | null): string | null {
	if (Array.isArray(rooms)) return rooms[0]?.name ?? null;
	return rooms?.name ?? null;
}

export interface AgreementMailAvailabilitySlot {
	start_time: string;
	end_time: string;
	room_name: string | null;
}

function clockToMinutes(time: string): number | null {
	const match = /^(\d{1,2}):(\d{2})/.exec(time);
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return null;
	return hours * 60 + minutes;
}

export function resolveAgreementRoomLabel(
	slots: readonly AgreementMailAvailabilitySlot[],
	lessonStart: string,
): string {
	const start = clockToMinutes(lessonStart);
	if (start === null) return AGREEMENT_MAIL_UNKNOWN_ROOM;

	let chosenName: string | null = null;
	let chosenStart = -1;
	for (const slot of slots) {
		const slotStart = clockToMinutes(slot.start_time);
		const slotEnd = clockToMinutes(slot.end_time);
		if (slotStart === null || slotEnd === null) continue;
		if (start < slotStart || start >= slotEnd) continue;
		if (slotStart < chosenStart) continue;
		chosenName = slot.room_name;
		chosenStart = slotStart;
	}

	return agreementRoomDisplayLabel(chosenName);
}
