export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export function timeToMinutes(timeStr: string): number | null {
	if (!TIME_REGEX.test(timeStr)) return null;
	const [h, m] = timeStr.split(':');
	return Number(h) * 60 + Number(m);
}

export function minutesToHHmm(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeRangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
	return start1 < end2 && start2 < end1;
}

export function splitTimeRangeIntoSlots(
	startTime: string,
	endTime: string,
	durationMinutes: number,
): { start_time: string; end_time: string }[] {
	if (durationMinutes <= 0) return [];

	const startMin = timeToMinutes(startTime);
	const endMin = timeToMinutes(endTime);
	if (startMin === null || endMin === null) return [];

	const slots = [];
	for (let t = startMin; t + durationMinutes <= endMin; t += durationMinutes) {
		slots.push({
			start_time: minutesToHHmm(t),
			end_time: minutesToHHmm(t + durationMinutes),
		});
	}
	return slots;
}
