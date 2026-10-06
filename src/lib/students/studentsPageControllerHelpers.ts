import { toast } from 'sonner';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchSignupRequestsByEmails } from '@/lib/signup-requests/signupRequestMappers';
import { deleteStudentAgreements, deleteStudentUser, getAgreementIds } from '@/lib/students/studentsPageHelpers';
import { mapStudentSortColumn } from '@/lib/students/studentsTableColumns';
import {
	flattenStudentWithAgreements,
	type PaginatedStudentsResponseRaw,
	type StudentWithAgreements,
} from '@/types/students';

type StudentRunActionKind = 'open-delete' | 'confirm-delete';

export interface ExecuteStudentsPageLoadParams {
	authLoading: boolean;
	hasAccess: boolean;
	limit: number;
	offset: number;
	search: string;
	statusFilter: 'active' | 'inactive' | 'all' | null;
	lessonTypeId: string | null;
	sortColumn: string | null;
	sortDirection: 'asc' | 'desc' | null;
}

function buildStudentsPageLoadRpcParams(params: ExecuteStudentsPageLoadParams) {
	return {
		p_limit: params.limit,
		p_offset: params.offset,
		p_search: params.search ? params.search : undefined,
		p_status: params.statusFilter ?? undefined,
		p_lesson_type_id: params.lessonTypeId ?? undefined,
		p_sort_column: mapStudentSortColumn(params.sortColumn),
		p_sort_direction: params.sortDirection || 'asc',
	};
}

export type StudentsPageLoadOutcome =
	| { kind: 'skipped' }
	| {
			kind: 'success';
			students: StudentWithAgreements[];
			totalCount: number;
			requestsByEmail: Map<string, SignupRequestDetail[]>;
	  }
	| { kind: 'error' };

export async function executeStudentsPageLoad(params: ExecuteStudentsPageLoadParams): Promise<StudentsPageLoadOutcome> {
	if (params.authLoading || !params.hasAccess) {
		return { kind: 'skipped' };
	}

	try {
		const { data, error } = await supabase.rpc('get_students_paginated', buildStudentsPageLoadRpcParams(params));

		if (error) {
			console.error('Error loading students:', error);
			toast.error('Fout bij laden leerlingen');
			return { kind: 'error' };
		}

		const result = data as unknown as PaginatedStudentsResponseRaw;
		const students = (result.data ?? []).map(flattenStudentWithAgreements);
		const emails = students.map((student) => student.email).filter((email): email is string => Boolean(email));
		const requestsByEmail = await fetchSignupRequestsByEmails(emails);

		return {
			kind: 'success',
			students,
			totalCount: result.total_count ?? 0,
			requestsByEmail,
		};
	} catch (loadError) {
		console.error('Error loading students:', loadError);
		toast.error('Fout bij laden leerlingen');
		return { kind: 'error' };
	}
}

export function applyStudentsPageLoadOutcome(
	outcome: StudentsPageLoadOutcome,
	setStudents: (students: StudentWithAgreements[]) => void,
	setTotalCount: (count: number) => void,
	setRequestsByEmail: (requests: Map<string, SignupRequestDetail[]>) => void,
): boolean {
	if (outcome.kind === 'success') {
		setStudents(outcome.students);
		setTotalCount(outcome.totalCount);
		setRequestsByEmail(outcome.requestsByEmail);
	}
	return outcome.kind !== 'skipped';
}

export type StudentAction = { kind: 'delete'; student: StudentWithAgreements } | { kind: 'confirm-delete' };

function resolveStudentRunAction(action: { kind: 'delete' | 'confirm-delete' }): StudentRunActionKind {
	if (action.kind === 'delete') return 'open-delete';
	return 'confirm-delete';
}

type StudentDeleteToastKind = 'user-deleted' | 'agreements-deleted';

function resolveStudentDeleteToastKind(deleteUser: boolean): StudentDeleteToastKind {
	return deleteUser ? 'user-deleted' : 'agreements-deleted';
}

function getStudentDeleteSuccessMessage(deleteUser: boolean): string {
	return resolveStudentDeleteToastKind(deleteUser) === 'user-deleted'
		? 'Leerling en gebruiker verwijderd'
		: 'Leerling verwijderd';
}

async function executeStudentDelete(student: StudentWithAgreements, deleteUser: boolean): Promise<void> {
	if (deleteUser) {
		const { error } = await deleteStudentUser(student.user_id);
		if (error) {
			toast.error('Fout bij verwijderen gebruiker', { description: error });
			throw new Error(error);
		}
		toast.success(getStudentDeleteSuccessMessage(true));
		return;
	}

	const { error } = await deleteStudentAgreements(getAgreementIds(student));
	if (error) {
		toast.error('Fout bij verwijderen lesovereenkomsten', { description: error });
		throw new Error(error);
	}
	toast.success(getStudentDeleteSuccessMessage(false));
}

export interface StudentPageControllerSetters {
	setDeleteDialog: (value: { open: boolean; student: StudentWithAgreements; deleteUser: boolean } | null) => void;
	loadStudents: () => void;
}

type StudentPageActionOutcome =
	| { kind: 'open-delete'; student: StudentWithAgreements }
	| { kind: 'execute-delete'; student: StudentWithAgreements; deleteUser: boolean }
	| { kind: 'noop' };

function resolveStudentPageActionOutcome(
	action: StudentAction,
	deleteDialog: { open: boolean; student: StudentWithAgreements; deleteUser: boolean } | null,
): StudentPageActionOutcome {
	const resolved = resolveStudentRunAction(action);
	if (resolved === 'open-delete' && action.kind === 'delete') {
		return { kind: 'open-delete', student: action.student };
	}
	if (!deleteDialog?.student) {
		return { kind: 'noop' };
	}
	return {
		kind: 'execute-delete',
		student: deleteDialog.student,
		deleteUser: deleteDialog.deleteUser,
	};
}

export async function runStudentPageAction(
	action: StudentAction,
	deleteDialog: { open: boolean; student: StudentWithAgreements; deleteUser: boolean } | null,
	setters: StudentPageControllerSetters,
): Promise<void> {
	const outcome = resolveStudentPageActionOutcome(action, deleteDialog);
	if (outcome.kind === 'open-delete') {
		setters.setDeleteDialog({ open: true, student: outcome.student, deleteUser: false });
		return;
	}
	if (outcome.kind === 'noop') {
		return;
	}

	try {
		await executeStudentDelete(outcome.student, outcome.deleteUser);
		setters.setDeleteDialog(null);
		setters.loadStudents();
	} catch (error) {
		console.error('Error deleting student:', error);
		toast.error('Fout bij verwijderen leerling', {
			description: 'Er is een netwerkfout opgetreden. Probeer het later opnieuw.',
		});
		throw error;
	}
}
