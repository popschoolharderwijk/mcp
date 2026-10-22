import { describe, expect, it } from 'bun:test';
import {
	applyReportSearch,
	buildHoursReportRpcParams,
	buildReportLessonTypeOptions,
	computeReportSummary,
	filterReportRows,
	parseHoursReportResult,
} from '../../../src/lib/reports/reportDerivedData';
import type { ReportRow } from '../../../src/types/reports';

function makeReportRow(overrides: Partial<ReportRow> = {}): ReportRow {
	return {
		source_type: 'lesson',
		teacher_user_id: 'teacher-1',
		teacher_name: 'Anna Docent',
		lesson_type_id: 'lt-piano',
		lesson_type_name: 'Piano',
		lesson_type_color: '#FF5733',
		lesson_type_icon: 'piano',
		age_category: 'youth',
		total_minutes: 60,
		lesson_count: 2,
		duo_perspective: null,
		project_id: null,
		project_name: null,
		...overrides,
	};
}

describe('filterReportRows', () => {
	const rows = [
		makeReportRow(),
		makeReportRow({
			source_type: 'project',
			lesson_type_id: null,
			lesson_type_name: null,
			project_id: 'proj-1',
			project_name: 'Bandproject',
			age_category: 'adult',
			total_minutes: 90,
			lesson_count: 0,
		}),
		makeReportRow({
			lesson_type_id: 'lt-guitar',
			lesson_type_name: 'Gitaar',
			age_category: 'adult',
		}),
	];

	it('returns all rows when no filters are set', () => {
		expect(filterReportRows(rows, { sourceType: null, lessonTypeId: null, ageCategory: null })).toHaveLength(3);
	});

	it('filters by source type', () => {
		const result = filterReportRows(rows, { sourceType: 'project', lessonTypeId: null, ageCategory: null });
		expect(result).toHaveLength(1);
		expect(result[0]?.project_name).toBe('Bandproject');
	});

	it('filters by lesson type id', () => {
		const result = filterReportRows(rows, { sourceType: null, lessonTypeId: 'lt-guitar', ageCategory: null });
		expect(result).toHaveLength(1);
		expect(result[0]?.lesson_type_name).toBe('Gitaar');
	});

	it('filters by age category', () => {
		const result = filterReportRows(rows, { sourceType: null, lessonTypeId: null, ageCategory: 'youth' });
		expect(result).toHaveLength(1);
		expect(result[0]?.lesson_type_name).toBe('Piano');
	});
});

describe('applyReportSearch', () => {
	const rows = [
		makeReportRow({ teacher_name: 'Anna Docent', lesson_type_name: 'Piano' }),
		makeReportRow({
			teacher_name: 'Bob Docent',
			lesson_type_name: 'Gitaar',
			project_name: 'Bandproject',
			source_type: 'project',
			project_id: 'proj-1',
		}),
	];

	it('returns the input unchanged for an empty search query', () => {
		expect(applyReportSearch(rows, '')).toEqual(rows);
		expect(applyReportSearch(rows, '   ')).toEqual(rows);
	});

	it('matches teacher name case-insensitively', () => {
		const result = applyReportSearch(rows, 'anna');
		expect(result).toHaveLength(1);
		expect(result[0]?.teacher_name).toBe('Anna Docent');
	});

	it('matches lesson type name and project name', () => {
		expect(applyReportSearch(rows, 'gitaar')).toHaveLength(1);
		expect(applyReportSearch(rows, 'bandproject')).toHaveLength(1);
	});

	it('matches age category labels', () => {
		const rowsWithMixedAges = [
			makeReportRow({ teacher_name: 'Anna Docent', lesson_type_name: 'Piano', age_category: 'youth' }),
			makeReportRow({
				teacher_name: 'Bob Docent',
				lesson_type_name: 'Gitaar',
				age_category: 'adult',
			}),
		];
		const result = applyReportSearch(rowsWithMixedAges, 'jongeren');
		expect(result).toHaveLength(1);
		expect(result[0]?.lesson_type_name).toBe('Piano');
	});
});

describe('buildReportLessonTypeOptions', () => {
	it('deduplicates lesson type options from lesson rows only', () => {
		const rows = [
			makeReportRow({ lesson_type_id: 'lt-piano', lesson_type_name: 'Piano' }),
			makeReportRow({ lesson_type_id: 'lt-piano', lesson_type_name: 'Piano' }),
			makeReportRow({
				source_type: 'project',
				lesson_type_id: null,
				project_id: 'proj-1',
				project_name: 'Bandproject',
			}),
			makeReportRow({
				lesson_type_id: 'lt-guitar',
				lesson_type_name: 'Gitaar',
				lesson_type_icon: 'guitar',
				lesson_type_color: '#00FF00',
			}),
		];

		expect(buildReportLessonTypeOptions(rows)).toEqual([
			{ id: 'lt-piano', label: 'Piano', icon: 'piano', color: '#FF5733' },
			{ id: 'lt-guitar', label: 'Gitaar', icon: 'guitar', color: '#00FF00' },
		]);
	});
});

describe('computeReportSummary', () => {
	it('aggregates minutes and lesson counts while skipping student duo rows', () => {
		const rows = [
			makeReportRow({
				total_minutes: 60,
				lesson_count: 2,
				age_category: 'youth',
				source_type: 'lesson',
			}),
			makeReportRow({
				total_minutes: 45,
				lesson_count: 1,
				age_category: 'adult',
				source_type: 'lesson',
			}),
			makeReportRow({
				total_minutes: 30,
				lesson_count: 0,
				source_type: 'project',
				project_id: 'proj-1',
				project_name: 'Bandproject',
				age_category: 'unknown',
			}),
			makeReportRow({
				total_minutes: 999,
				lesson_count: 99,
				duo_perspective: 'student_lesson',
			}),
		];

		expect(computeReportSummary(rows)).toEqual({
			totalMinutes: 135,
			totalLessons: 3,
			youthMinutes: 60,
			adultMinutes: 45,
			projectMinutes: 30,
		});
	});
});

describe('buildHoursReportRpcParams', () => {
	it('includes teacher filter for privileged users with a specific teacher', () => {
		expect(buildHoursReportRpcParams('2026-01-01', '2026-01-31', true, 'teacher-1')).toEqual({
			p_start_date: '2026-01-01',
			p_end_date: '2026-01-31',
			p_teacher_user_id: 'teacher-1',
		});
	});

	it('omits teacher filter for all teachers', () => {
		expect(buildHoursReportRpcParams('2026-01-01', '2026-01-31', true, 'all')).toEqual({
			p_start_date: '2026-01-01',
			p_end_date: '2026-01-31',
		});
	});
});

describe('parseHoursReportResult', () => {
	it('returns report rows from rpc payload', () => {
		const row = makeReportRow();
		expect(parseHoursReportResult({ data: [row] })).toEqual([row]);
	});

	it('returns an empty array for missing data', () => {
		expect(parseHoursReportResult({})).toEqual([]);
	});
});
