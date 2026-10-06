import { describe, expect, it } from 'bun:test';
import {
	applyInitialStudentsSearchParam,
	buildStudentsRowActions,
} from '../../../src/lib/students/studentsPageViewHelpers';

describe('applyInitialStudentsSearchParam', () => {
	it('returns null when search param is absent', () => {
		let appliedQuery = '';
		expect(
			applyInitialStudentsSearchParam(new URLSearchParams(), (query) => {
				appliedQuery = query;
			}),
		).toBeNull();
		expect(appliedQuery).toBe('');
	});

	it('applies search param and returns updated params without search key', () => {
		let appliedQuery = '';
		const nextParams = applyInitialStudentsSearchParam(new URLSearchParams('search=anna&page=2'), (query) => {
			appliedQuery = query;
		});
		expect(appliedQuery).toBe('anna');
		expect(nextParams?.get('search')).toBeNull();
		expect(nextParams?.get('page')).toBe('2');
	});
});

describe('buildStudentsRowActions', () => {
	it('returns edit and delete handlers for privileged admins', () => {
		const editedIds: string[] = [];
		const actions: string[] = [];
		const rowActions = buildStudentsRowActions(
			true,
			true,
			false,
			(student) => {
				editedIds.push(student.user_id);
			},
			(action) => {
				actions.push(action.kind);
			},
		);
		rowActions.onEdit?.({ user_id: 'student-1' } as never);
		rowActions.onDelete?.({ user_id: 'student-1' } as never);
		expect(editedIds).toEqual(['student-1']);
		expect(actions).toEqual(['delete']);
	});

	it('returns no handlers when user lacks permissions', () => {
		const rowActions = buildStudentsRowActions(
			false,
			false,
			false,
			() => {},
			() => {},
		);
		expect(rowActions.onEdit).toBeUndefined();
		expect(rowActions.onDelete).toBeUndefined();
	});
});
