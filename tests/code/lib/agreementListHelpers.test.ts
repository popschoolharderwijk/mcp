import { describe, expect, it } from 'bun:test';
import { filterAgreementRows, sortAgreementRows } from '../../../src/lib/agreements/agreementListHelpers';
import type { AgreementTableRow } from '../../../src/types/lesson-agreements';

function mockRow(overrides: Partial<AgreementTableRow> = {}): AgreementTableRow {
	return {
		id: 'agr-1',
		day_of_week: 1,
		start_time: '09:00',
		start_date: '2026-09-01',
		end_date: null,
		is_active: true,
		student_user_id: 'stu-1',
		lesson_type_id: 'lt-1',
		duration_minutes: 60,
		frequency: 'weekly',
		created_at: '2026-01-01T00:00:00Z',
		notes: null,
		payment_method: 'sepa',
		sepa_mandate_id: null,
		teacher_user_id: 'tea-1',
		student: {
			first_name: 'Jan',
			last_name: 'Jansen',
			avatar_url: null,
			email: 'jan@example.com',
		},
		teacher: {
			first_name: 'Piet',
			last_name: 'Docent',
			avatar_url: null,
			email: 'piet@example.com',
		},
		lesson_type: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000' },
		...overrides,
	};
}

const rows = [
	mockRow(),
	mockRow({
		id: 'agr-2',
		student: {
			first_name: 'Anna',
			last_name: 'Bakker',
			avatar_url: null,
			email: 'anna@example.com',
		},
		teacher: {
			first_name: 'Kees',
			last_name: 'Meester',
			avatar_url: null,
			email: 'kees@example.com',
		},
		lesson_type: { id: 'lt-2', name: 'Gitaar', icon: 'guitar', color: '#ff0000' },
	}),
];

describe('filterAgreementRows', () => {
	it('returns all rows when search is empty', () => {
		expect(filterAgreementRows(rows, '')).toEqual(rows);
	});

	it('filters by student name', () => {
		expect(filterAgreementRows(rows, 'bakker')).toHaveLength(1);
		expect(filterAgreementRows(rows, 'bakker')[0]?.id).toBe('agr-2');
	});

	it('filters by teacher name', () => {
		expect(filterAgreementRows(rows, 'docent')).toHaveLength(1);
		expect(filterAgreementRows(rows, 'docent')[0]?.id).toBe('agr-1');
	});

	it('filters by lesson type name', () => {
		expect(filterAgreementRows(rows, 'gitaar')).toHaveLength(1);
		expect(filterAgreementRows(rows, 'gitaar')[0]?.id).toBe('agr-2');
	});

	it('filters by student email', () => {
		expect(filterAgreementRows(rows, 'jan@example.com')).toHaveLength(1);
		expect(filterAgreementRows(rows, 'jan@example.com')[0]?.id).toBe('agr-1');
	});

	it('filters by partial teacher first name', () => {
		expect(filterAgreementRows(rows, 'kees')).toHaveLength(1);
		expect(filterAgreementRows(rows, 'kees')[0]?.id).toBe('agr-2');
	});

	it('returns an empty array when nothing matches', () => {
		expect(filterAgreementRows(rows, 'viool')).toHaveLength(0);
	});
});

describe('sortAgreementRows', () => {
	it('sorts by student name ascending', () => {
		const sorted = sortAgreementRows(rows, 'student', 'asc');
		expect(sorted.map((row) => row.id)).toEqual(['agr-2', 'agr-1']);
	});

	it('sorts by student name descending', () => {
		const sorted = sortAgreementRows(rows, 'student', 'desc');
		expect(sorted.map((row) => row.id)).toEqual(['agr-1', 'agr-2']);
	});

	it('sorts by teacher name ascending', () => {
		const sorted = sortAgreementRows(rows, 'teacher', 'asc');
		expect(sorted.map((row) => row.id)).toEqual(['agr-2', 'agr-1']);
	});

	it('sorts by teacher name descending', () => {
		const sorted = sortAgreementRows(rows, 'teacher', 'desc');
		expect(sorted.map((row) => row.id)).toEqual(['agr-1', 'agr-2']);
	});

	it('sorts by student name descending when sort direction is null', () => {
		const sorted = sortAgreementRows(rows, 'student', null);
		expect(sorted.map((row) => row.id)).toEqual(['agr-1', 'agr-2']);
	});

	it('sorts by teacher name descending when sort direction is null', () => {
		const sorted = sortAgreementRows(rows, 'teacher', null);
		expect(sorted.map((row) => row.id)).toEqual(['agr-1', 'agr-2']);
	});

	it('returns rows unchanged for unsupported sort columns', () => {
		const sorted = sortAgreementRows(rows, 'lesson_type', 'asc');
		expect(sorted).toEqual(rows);
	});
});
