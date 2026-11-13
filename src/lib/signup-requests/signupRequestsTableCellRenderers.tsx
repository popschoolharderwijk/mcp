import { Badge } from '@/components/ui/badge';
import { UserDisplay } from '@/components/ui/user-display';
import { signupApplicantDisplayProfile } from '@/lib/signup-requests/signupRequestEnrichmentHelpers';
import { SIGNUP_REQUEST_STATUS_LABELS } from '@/lib/signup-requests/signupRequestStatuses';
import { type SignupRequestRowBase, statusBadgeVariant } from '@/lib/signup-requests/signupRequestsPageHelpers';
import { SignupLessonTypeCellLines } from '@/lib/signup-requests/signupRequestsTableCellParts';
import {
	formatSignupTrialScheduledLine,
	getSignupLessonTypeCellContent,
} from '@/lib/signup-requests/signupRequestsTableFormatters';

interface SignupLessonTypeCellProps {
	row: SignupRequestRowBase;
}

export function SignupRequestLessonTypeCell({ row }: SignupLessonTypeCellProps) {
	const content = getSignupLessonTypeCellContent(row);
	return <SignupLessonTypeCellLines content={content} />;
}

interface SignupStatusCellProps {
	row: SignupRequestRowBase;
	formatDate: (value: string) => string;
}

export function SignupRequestStatusCell({ row, formatDate }: SignupStatusCellProps) {
	const trialLine = formatSignupTrialScheduledLine(row, formatDate);
	return (
		<div className="space-y-1">
			<Badge variant={statusBadgeVariant(row.status)}>{SIGNUP_REQUEST_STATUS_LABELS[row.status]}</Badge>
			{trialLine && <div className="text-xs text-muted-foreground">{trialLine}</div>}
		</div>
	);
}

interface SignupNameCellProps {
	row: SignupRequestRowBase;
}

export function SignupRequestNameCell({ row }: SignupNameCellProps) {
	return <UserDisplay profile={signupApplicantDisplayProfile(row)} showEmail />;
}
