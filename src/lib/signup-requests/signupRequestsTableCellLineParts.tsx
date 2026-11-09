import { Badge } from '@/components/ui/badge';
import type { SignupLessonTypeCellLine } from '@/lib/signup-requests/signupRequestsTableCellHelpers';

interface SignupLessonTypeCellLineItemProps {
	line: SignupLessonTypeCellLine;
}

export function signupLessonTypeCellLineKey(line: SignupLessonTypeCellLine): string {
	if (line.kind === 'text') return `text:${line.text}:${line.muted ? 'muted' : 'plain'}`;
	return 'waitlist-badge';
}

export function SignupLessonTypeCellLineItem({ line }: SignupLessonTypeCellLineItemProps) {
	const lineKey = signupLessonTypeCellLineKey(line);

	if (line.kind === 'text') {
		return (
			<div key={lineKey} className={line.muted ? 'text-xs text-muted-foreground' : undefined}>
				{line.text}
			</div>
		);
	}
	return (
		<Badge key={lineKey} variant="outline">
			Wachtlijst
		</Badge>
	);
}
