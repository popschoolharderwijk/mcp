import { toast } from 'sonner';
import { showStudentSubmitError, updateExistingStudent } from '@/components/students/studentFormPersistence';
import type { StudentFormState } from '@/components/students/studentFormTypes';
import {
	resolveStudentProfileSaveValidationError,
	type StudentFormSaveScope,
} from '@/components/students/studentFormValidation';
import type { Student } from '@/types/students';

export type { StudentFormSaveScope };

export interface StudentProfileSaveParams {
	form: StudentFormState;
	student: Student;
	scope: StudentFormSaveScope;
	dateOfBirthDraftSynced?: boolean;
}

export type StudentFormSubmitOutcome = 'validation-error' | 'persist-error' | 'success';

export async function executeStudentProfileSave(params: StudentProfileSaveParams): Promise<StudentFormSubmitOutcome> {
	const validationError = resolveStudentProfileSaveValidationError(params);
	if (validationError) {
		toast.error(validationError);
		return 'validation-error';
	}

	const result = await updateExistingStudent(params.student, params.form, params.scope);
	if (result.ok === false) {
		showStudentSubmitError(result);
		return 'persist-error';
	}
	toast.success('Leerling bijgewerkt');
	return 'success';
}
