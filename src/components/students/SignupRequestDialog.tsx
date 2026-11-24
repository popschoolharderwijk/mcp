import { SignupRequestDialogBody } from '@/components/students/SignupRequestDialogBody';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDbDateLong } from '@/lib/date/date-format';
import type { SignupRequestStatus } from '@/lib/signup-requests/signupRequestStatuses';

export interface SignupRequestDetail {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone_number: string | null;
	parent_name: string | null;
	parent_email: string | null;
	parent_phone_number: string | null;
	date_of_birth: string | null;
	notes: string | null;
	status: SignupRequestStatus;
	created_at: string;
	processed_at: string | null;
	lesson_type_name: string | null;
	lesson_group_name: string | null;
}

interface SignupRequestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	request: SignupRequestDetail | null;
}

export function SignupRequestDialog({ open, onOpenChange, request }: SignupRequestDialogProps) {
	if (!request) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Aanmelding details</DialogTitle>
					<DialogDescription>Ontvangen op {formatDbDateLong(request.created_at)}</DialogDescription>
				</DialogHeader>
				<SignupRequestDialogBody request={request} />
			</DialogContent>
		</Dialog>
	);
}
