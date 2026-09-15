import { toast } from 'sonner';
import {
	buildCreateStudentPayload,
	buildStudentProfileUpdateFields,
	resolveCreateStudentInvokeResult,
	type StudentSubmitError,
	type StudentSubmitResult,
} from '@/components/students/studentFormPersistenceHelpers';
import {
	type StudentFormMode,
	type StudentFormState,
	studentRecordFields,
} from '@/components/students/studentFormTypes';
import { supabase } from '@/integrations/supabase/client';
import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import type { Student } from '@/types/students';

export type { StudentSubmitError, StudentSubmitResult } from '@/components/students/studentFormPersistenceHelpers';

async function updateProfileForUser(
	userId: string,
	form: StudentFormState,
	errorTitle: string,
): Promise<StudentSubmitResult> {
	const { error } = await supabase
		.from('profiles')
		.update(buildStudentProfileUpdateFields(form))
		.eq('user_id', userId);

	if (error) {
		return { ok: false, title: errorTitle, description: error.message };
	}
	return { ok: true };
}

export async function updateExistingStudent(student: Student, form: StudentFormState): Promise<StudentSubmitResult> {
	const profileResult = await updateProfileForUser(student.user_id, form, 'Fout bij bijwerken profiel');
	if (!profileResult.ok) return profileResult;

	const { error: studentError } = await supabase
		.from('students')
		.update(studentRecordFields(form))
		.eq('user_id', student.user_id);

	if (studentError) {
		return { ok: false, title: 'Fout bij bijwerken leerling', description: studentError.message };
	}

	return { ok: true };
}

export async function createStudentRecord(
	form: StudentFormState,
	mode: StudentFormMode,
	selectedUserId: string | null,
): Promise<StudentSubmitResult> {
	const { data, error: invokeError } = await supabase.functions.invoke('create-student', {
		body: buildCreateStudentPayload(form, mode, selectedUserId),
	});

	if (invokeError) {
		const description = await getInvokeErrorMessage(invokeError);
		return { ok: false, title: 'Fout bij aanmaken leerling', description };
	}

	return resolveCreateStudentInvokeResult(data);
}

export function showStudentSubmitError(result: StudentSubmitError): void {
	toast.error(result.title, result.description ? { description: result.description } : undefined);
}
