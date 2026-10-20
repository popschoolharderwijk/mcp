import { LessonAgreementDialogContent } from '@/components/students/LessonAgreementDialogContent';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getUserInitials } from '@/components/ui/user-display';
import { useAuth } from '@/hooks/useAuth';
import { useLessonFeePreview } from '@/hooks/useLessonFeePreview';
import { loadAgreementFeePreview } from '@/lib/billing/loadLessonFeePreview';
import { DAY_NAMES } from '@/lib/date/day-index';
import { getDisplayName } from '@/lib/display-name';
import { resolveAgreementFeePreviewKey } from '@/lib/students/lessonAgreementDialogHelpers';
import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';

interface LessonAgreementDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agreement: LessonAgreementWithTeacher | null;
	/**
	 * Optional: student id needed to show the fee preview (privileged users only).
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
	const previewKey = resolveAgreementFeePreviewKey(agreement, studentUserId, lessonTypeId, isPrivileged);
	const {
		preview,
		loading: previewLoading,
		error: previewError,
	} = useLessonFeePreview(previewKey, () => loadAgreementFeePreview(agreement?.id ?? '', studentUserId ?? ''));

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
					showPreviewBlock={previewKey !== null}
					previewLoading={previewLoading}
					previewError={previewError}
					preview={preview}
				/>
			</DialogContent>
		</Dialog>
	);
}
