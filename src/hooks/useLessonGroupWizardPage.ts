import { useEffect } from 'react';
import { useLessonGroupWizard } from '@/components/lesson-groups/wizard/useLessonGroupWizard';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { resolveLessonGroupWizardPageGate } from '@/lib/lesson-groups/lessonGroupWizardShellHelpers';

export function useLessonGroupWizardPage() {
	const wizard = useLessonGroupWizard();
	const pageGate = resolveLessonGroupWizardPageGate(wizard.authLoading, wizard.loading, wizard.canEdit);
	const { setBreadcrumbSuffix } = useBreadcrumb();

	useEffect(() => {
		if (!wizard.isEditMode || !wizard.form.name) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: wizard.form.name }]);
		return () => setBreadcrumbSuffix([]);
	}, [wizard.isEditMode, wizard.form.name, setBreadcrumbSuffix]);

	return {
		wizard,
		pageGate,
		partialSlotHandlers: {
			onCancel: () => {
				wizard.setPartialOpen(false);
				wizard.clearSlot();
			},
			onConfirm: () => wizard.setPartialOpen(false),
		},
	};
}
