import { useCallback, useEffect, useState } from 'react';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';
import { hasStudentFormScopeChanges } from '@/components/students/studentFormPersistenceHelpers';
import { executeStudentProfileSave, type StudentFormSaveScope } from '@/components/students/studentFormSubmitHelpers';
import { type StudentFormState, studentFormFromStudent } from '@/components/students/studentFormTypes';
import type { Student } from '@/types/students';

export function useStudentProfileForm(student: Student, onUpdate?: () => void) {
	const [form, setForm] = useState<StudentFormState>(() => studentFormFromStudent(student));
	const [baseline, setBaseline] = useState<StudentFormState>(() => studentFormFromStudent(student));
	const [saving, setSaving] = useState(false);
	const [dateOfBirthDraftSynced, setDateOfBirthDraftSynced] = useState(true);

	useEffect(() => {
		const next = studentFormFromStudent(student);
		setForm(next);
		setBaseline(next);
		setDateOfBirthDraftSynced(true);
	}, [student]);

	const vm: StudentFormFieldsViewModel = {
		form,
		setForm,
		isEditMode: true,
	};

	const hasScopeChanges = (scope: StudentFormSaveScope) => hasStudentFormScopeChanges(baseline, form, scope);

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
				if (outcome === 'success') {
					setBaseline(form);
					onUpdate?.();
				}
			} finally {
				setSaving(false);
			}
		},
		[dateOfBirthDraftSynced, form, onUpdate, student],
	);

	return { vm, saving, runSave, setDateOfBirthDraftSynced, hasScopeChanges };
}
