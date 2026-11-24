import type { PaginatedStudentsResponseRaw, StudentWithAgreements } from '@/types/students';
import { flattenStudentWithAgreements } from '@/types/students';

export interface MyStudentsLoadParams {
	limit: number;
	offset: number;
	search: string | null;
}

export function buildMyStudentsLoadParams(
	currentPage: number,
	rowsPerPage: number,
	search: string,
): MyStudentsLoadParams {
	return {
		limit: rowsPerPage,
		offset: (currentPage - 1) * rowsPerPage,
		search: search || null,
	};
}

export function mapMyStudentsPaginatedResponse(data: unknown): {
	students: StudentWithAgreements[];
	totalCount: number;
} {
	const result = data as PaginatedStudentsResponseRaw;
	return {
		students: (result.data ?? []).map(flattenStudentWithAgreements),
		totalCount: result.total_count ?? 0,
	};
}

export interface MyStudentLessonTypeBadge {
	key: string;
	name: string;
}

export function collectMyStudentLessonTypes(student: StudentWithAgreements): MyStudentLessonTypeBadge[] {
	const types = new Map<string, MyStudentLessonTypeBadge>();
	for (const agreement of student.agreements) {
		if (!agreement.lesson_type) continue;
		types.set(agreement.lesson_type.id, {
			key: agreement.lesson_type.id,
			name: agreement.lesson_type.name,
		});
	}
	return Array.from(types.values());
}
