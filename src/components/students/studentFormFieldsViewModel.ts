import type { StudentFormState } from '@/components/students/studentFormTypes';

/** Shared prop shape for student form field sections (detail page profile edit). */
export interface StudentFormFieldsViewModel {
	form: StudentFormState;
	setForm: (form: StudentFormState) => void;
	isEditMode: boolean;
}
