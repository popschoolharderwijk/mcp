import { describe, expect, it } from 'bun:test';
import { buildReportColumns } from '../../../src/components/reports/reportColumns';
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

describe('buildReportColumns', () => {
	it('includes the teacher column for privileged users', () => {
		const columns = buildReportColumns(true);
		expect(columns.map((column) => column.key)).toEqual([
			'teacher_name',
			'category',
			'age_category',
			'lesson_count',
			'total_minutes',
		]);
	});

	it('omits the teacher column for non-privileged users', () => {
		const columns = buildReportColumns(false);
		expect(columns.map((column) => column.key)).toEqual([
			'category',
			'age_category',
			'lesson_count',
			'total_minutes',
		]);
	});

	it('sorts category by project name for project rows', () => {
		const columns = buildReportColumns(false);
		const categoryColumn = columns.find((column) => column.key === 'category');
		const row = makeReportRow({
			source_type: 'project',
			project_id: 'proj-1',
			project_name: 'Bandproject',
			lesson_type_name: null,
		});

		expect(categoryColumn?.sortValue?.(row)).toBe('bandproject');
	});

	it('sorts category by lesson type name for lesson rows', () => {
		const columns = buildReportColumns(false);
		const categoryColumn = columns.find((column) => column.key === 'category');
		const row = makeReportRow({ lesson_type_name: 'Piano' });

		expect(categoryColumn?.sortValue?.(row)).toBe('piano');
	});
});
