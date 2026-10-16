import type { MergedSlotMember } from '@/components/agenda/types';
import { getRevertibleMergedSlotMembers } from '@/lib/agenda/mergeSameSlotLessonEvents';
import { type RevertDeviationResult, revertDeviation } from '@/lib/agenda/revertDeviation';

export async function revertMergedSlotLessons(
	members: MergedSlotMember[] | undefined,
	fallback?: { eventId: string; originalDate: string },
): Promise<RevertDeviationResult> {
	const revertible = getRevertibleMergedSlotMembers(members);
	const targets =
		revertible.length > 0
			? revertible
			: fallback
				? [{ eventId: fallback.eventId, originalDate: fallback.originalDate, isDeviation: true }]
				: [];

	if (targets.length === 0) {
		return { ok: false, message: 'Geen afwijking om terug te zetten' };
	}

	let lastMessage = 'Afspraak teruggezet naar origineel';
	for (const target of targets) {
		const originalDate = target.originalDate;
		if (!originalDate) continue;
		const result = await revertDeviation({ eventId: target.eventId, originalDate });
		if (!result.ok) return result;
		lastMessage = result.message;
	}

	return {
		ok: true,
		message: targets.length > 1 ? 'Lessen teruggezet naar hun originele tijden' : lastMessage,
	};
}
