import { useCallback, useEffect, useState } from 'react';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';
import { executeStudentProfileSave, type StudentFormSaveScope } from '@/components/students/studentFormSubmitHelpers';
import { type StudentFormState, studentFormFromStudent } from '@/components/students/studentFormTypes';
import type { Student } from '@/types/students';

export function useStudentProfileForm(student: Student, onUpdate?: () => void) {
	const [form, setForm] = useState<StudentFormState>(() => studentFormFromStudent(student));
	const [saving, setSaving] = useState(false);
	const [dateOfBirthDraftSynced, setDateOfBirthDraftSynced] = useState(true);

	useEffect(() => {
		setForm(studentFormFromStudent(student));
		setDateOfBirthDraftSynced(true);
	}, [student]);

	const vm: StudentFormFieldsViewModel = {
		form,
		setForm,
		isEditMode: true,
	};

	const runSave = useCallback(
		async (scope: StudentFormSaveScope) => {
			setSaving(true);
			try {
				const outcome = await executeStudentProfileSave({
					form,
					student,
					scope,
					dateOfBirthDraftSynced,
				});
				if (outcome === 'success') onUpdate?.();
			} finally {
				setSaving(false);
			}
		},
		[dateOfBirthDraftSynced, form, onUpdate, student],
	);

	return { vm, saving, runSave, setDateOfBirthDraftSynced };
}
