import { toast } from 'sonner';
import {
	buildCreateStudentPayload,
	buildStudentProfileUpdateFields,
	buildStudentRecordUpdateFields,
	resolveCreateStudentInvokeResult,
	type StudentSubmitError,
	type StudentSubmitResult,
} from '@/components/students/studentFormPersistenceHelpers';
import type { StudentFormMode, StudentFormState } from '@/components/students/studentFormTypes';
import type { StudentFormSaveScope } from '@/components/students/studentFormValidation';
import { supabase } from '@/integrations/supabase/client';
import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import type { Student } from '@/types/students';

export type { StudentSubmitError, StudentSubmitResult } from '@/components/students/studentFormPersistenceHelpers';

async function updateProfileForUser(
	userId: string,
	fields: NonNullable<ReturnType<typeof buildStudentProfileUpdateFields>>,
	errorTitle: string,
): Promise<StudentSubmitResult> {
	const { error } = await supabase
		.from('profiles')
		.update(fields as never)
		.eq('user_id', userId);

	if (error) {
		return { ok: false, title: errorTitle, description: error.message };
	}
	return { ok: true };
}

export async function updateExistingStudent(
	student: Student,
	form: StudentFormState,
	scope: StudentFormSaveScope,
): Promise<StudentSubmitResult> {
	const profileFields = buildStudentProfileUpdateFields(form, scope);
	if (profileFields) {
		const profileResult = await updateProfileForUser(student.user_id, profileFields, 'Fout bij bijwerken profiel');
		if (!profileResult.ok) return profileResult;
	}

	const studentFields = buildStudentRecordUpdateFields(form, scope);
	if (studentFields) {
		const { error: studentError } = await supabase
			.from('students')
			.update(studentFields)
			.eq('user_id', student.user_id);

		if (studentError) {
			return { ok: false, title: 'Fout bij bijwerken leerling', description: studentError.message };
		}
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
