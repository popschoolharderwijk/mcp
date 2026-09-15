import { useMemo } from 'react';
import { LessonAgreementDialogContent } from '@/components/students/LessonAgreementDialogContent';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getUserInitials } from '@/components/ui/user-display';
import { useAgreementBillingPreview } from '@/hooks/useAgreementBillingPreview';
import { useAuth } from '@/hooks/useAuth';
import { DAY_NAMES } from '@/lib/date/day-index';
import { getDisplayName } from '@/lib/display-name';
import {
	buildAgreementBillingPreviewInput,
	shouldShowAgreementPreviewBlock,
} from '@/lib/students/lessonAgreementDialogHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';

interface LessonAgreementDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agreement: LessonAgreementWithTeacher | null;
	/**
	 * Optional: IDs needed to show a live direct-debit preview.
	 * When provided, the "Incasso-preview" block appears with
	 * yearly/monthly amount based on price per lesson × frequency.
	 */
	studentUserId?: string;
	lessonTypeId?: string;
}

export function LessonAgreementDialog({
	open,
	onOpenChange,
	agreement,
	studentUserId,
	lessonTypeId,
}: LessonAgreementDialogProps) {
	const { isPrivileged } = useAuth();
	const previewInput = useMemo(
		() => buildAgreementBillingPreviewInput(agreement, studentUserId, lessonTypeId, isPrivileged),
		[agreement, studentUserId, lessonTypeId, isPrivileged],
	);
	const { preview, loading: previewLoading, error: previewError } = useAgreementBillingPreview(previewInput);

	if (!agreement) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Lesovereenkomst Details</DialogTitle>
					<DialogDescription>Bekijk alle details van deze lesovereenkomst</DialogDescription>
				</DialogHeader>

				<LessonAgreementDialogContent
					agreement={agreement}
					teacherName={getDisplayName(agreement.teacher)}
					teacherInitials={getUserInitials(agreement.teacher)}
					dayNames={DAY_NAMES}
					showPreviewBlock={shouldShowAgreementPreviewBlock(previewInput)}
					previewLoading={previewLoading}
					previewError={previewError}
					preview={preview}
				/>
			</DialogContent>
		</Dialog>
	);
}
