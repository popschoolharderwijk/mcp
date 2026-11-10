import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { LessonTypeListItem } from '../../../src/lib/lesson-types/lessonTypesPageHelpers';

const toastCalls: { kind: 'error' | 'success'; message: string; description?: string }[] = [];

mock.module('sonner', () => ({
	toast: {
		error: (message: string, options?: { description?: string }) => {
			toastCalls.push({ kind: 'error', message, description: options?.description });
		},
		success: (message: string, options?: { description?: string }) => {
			toastCalls.push({ kind: 'success', message, description: options?.description });
		},
	},
}));

const lessonTypes: LessonTypeListItem[] = [
	{
		id: 'lt-1',
		name: 'Piano',
		description: null,
		icon: 'piano',
		color: '#000',
		cost_center: null,
		is_group_lesson: false,
		is_active: true,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		options_count: 2,
	},
	{
		id: 'lt-2',
		name: 'Gitaar',
		description: null,
		icon: 'guitar',
		color: '#111',
		cost_center: null,
		is_group_lesson: false,
		is_active: true,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		options_count: 1,
	},
];

const supabaseMock = {
	from: () => ({
		delete: () => ({
			eq: () => Promise.resolve({ error: null }),
		}),
	}),
};

describe('runLessonTypeDelete', () => {
	let runLessonTypeDelete: typeof import('../../../src/lib/lesson-types/lessonTypesPageControllerHelpers').runLessonTypeDelete;

	beforeAll(async () => {
		({ runLessonTypeDelete } = await import('../../../src/lib/lesson-types/lessonTypesPageControllerHelpers'));
	});

	beforeEach(() => {
		toastCalls.length = 0;
	});

	it('removes the deleted lesson type from the list', async () => {
		let updatedList: LessonTypeListItem[] = [...lessonTypes];
		let deleteDialog: null | { id: string } = { id: 'lt-1' };

		await runLessonTypeDelete({
			lessonType: lessonTypes[0],
			supabase: supabaseMock as never,
			setLessonTypes: (updater) => {
				updatedList = updater(updatedList);
			},
			setDeleteDialog: (value) => {
				deleteDialog = value;
			},
		});

		expect(updatedList).toEqual([lessonTypes[1]]);
		expect(deleteDialog).toBeNull();
		expect(toastCalls[0]?.message).toBe('Lessoort verwijderd');
	});
});
