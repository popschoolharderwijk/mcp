import type { AccountingSettings, BatchItem, DirectDebitBatch, ProfileRow, StudentRow } from './types.ts';

export function collectUniqueStudentIds(items: Array<Pick<BatchItem, 'student_user_id'>>): string[] {
	return [...new Set(items.map((item) => item.student_user_id))];
}

export function extractMandateIds(items: Array<Pick<BatchItem, 'mandate_id'>>): string[] {
	return items.map((item) => item.mandate_id);
}

export function buildProfileMap(profiles: ProfileRow[]): Map<string, ProfileRow> {
	return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

export function buildStudentMap(students: StudentRow[]): Map<string, StudentRow> {
	return new Map(students.map((student) => [student.user_id, student]));
}

export function buildMandateMap(mandates: Array<{ id: string; mandate_reference: string }>): Map<string, string> {
	return new Map(mandates.map((mandate) => [mandate.id, mandate.mandate_reference]));
}

export interface BatchContextMapsInput {
	settings: AccountingSettings;
	batch: DirectDebitBatch;
	items: BatchItem[];
	profiles: ProfileRow[];
	students: StudentRow[];
	mandates: Array<{ id: string; mandate_reference: string }>;
}

export function buildBatchContextFromLoadedData(input: BatchContextMapsInput) {
	const studentIds = collectUniqueStudentIds(input.items);
	return {
		settings: input.settings,
		batch: input.batch,
		items: input.items,
		studentIds,
		profileMap: buildProfileMap(input.profiles),
		studentMap: buildStudentMap(input.students),
		mandateMap: buildMandateMap(input.mandates),
	};
}

export function hasBatchItems(items: BatchItem[] | null | undefined): items is BatchItem[] {
	return Boolean(items && items.length > 0);
}
