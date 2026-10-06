import type { StudentAction } from '@/lib/students/studentsPageControllerHelpers';
import type { StudentWithAgreements } from '@/types/students';

export function applyInitialStudentsSearchParam(
	searchParams: URLSearchParams,
	handleSearchChange: (query: string) => void,
): URLSearchParams | null {
	const query = searchParams.get('search');
	if (!query) return null;

	handleSearchChange(query);
	const nextParams = new URLSearchParams(searchParams);
	nextParams.delete('search');
	return nextParams;
}

export interface StudentsRowActions {
	onEdit?: (student: StudentWithAgreements) => void;
	onDelete?: (student: StudentWithAgreements) => void;
}

export function buildStudentsRowActions(
	isPrivileged: boolean,
	isAdmin: boolean,
	isSiteAdmin: boolean,
	onEdit: (student: StudentWithAgreements) => void,
	runAction: (action: StudentAction) => void,
): StudentsRowActions {
	const actions: StudentsRowActions = {};

	if (isPrivileged) {
		actions.onEdit = onEdit;
	}

	if (isAdmin || isSiteAdmin) {
		actions.onDelete = (student) => runAction({ kind: 'delete', student });
	}

	return actions;
}
