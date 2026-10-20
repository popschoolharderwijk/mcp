import { useEffect } from 'react';
import type { WizardFormState, WizardOptionSnapshot } from '@/components/agreements/wizard/wizardFormTypes';

interface LessonTypeOptionRow {
	id: string;
	duration_minutes: number;
	frequency: WizardOptionSnapshot['frequency'];
	label: string | null;
}

export function useWizardOptionPrefill(
	isEditMode: boolean,
	prefillOptionId: string | null,
	lessonTypeOptions: LessonTypeOptionRow[],
	setForm: React.Dispatch<React.SetStateAction<WizardFormState>>,
) {
	useEffect(() => {
		if (isEditMode || !prefillOptionId || lessonTypeOptions.length === 0) return;
		setForm((f) => {
			if (f.selectedOptionSnapshot) return f;
			const opt = lessonTypeOptions.find((o) => o.id === prefillOptionId);
			if (!opt) return f;
			return {
				...f,
				selectedOptionSnapshot: {
					id: opt.id,
					duration_minutes: opt.duration_minutes,
					frequency: opt.frequency,
					label: opt.label,
				},
			};
		});
	}, [isEditMode, prefillOptionId, lessonTypeOptions, setForm]);
}
