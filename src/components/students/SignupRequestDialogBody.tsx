import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { Badge } from '@/components/ui/badge';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDbDateLong } from '@/lib/date/date-format';
import {
	type SignupApplicantProfile,
	signupApplicantDisplayProfile,
} from '@/lib/signup-requests/signupRequestEnrichmentHelpers';
import { SIGNUP_REQUEST_STATUS_LABELS } from '@/lib/signup-requests/signupRequestStatuses';
import {
	hasSignupRequestParentInfo,
	resolveSignupRequestStatusVariant,
} from '@/lib/students/signupRequestDialogHelpers';

function SignupRequestField({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div>
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className="text-sm">{value || '-'}</p>
		</div>
	);
}

function SignupRequestStatusHeader({ request }: { request: SignupRequestDetail }) {
	const statusVariant = resolveSignupRequestStatusVariant(request.status);
	return (
		<div className="flex items-center gap-2">
			<Badge variant={statusVariant}>{SIGNUP_REQUEST_STATUS_LABELS[request.status]}</Badge>
			{request.processed_at && (
				<span className="text-xs text-muted-foreground">
					Verwerkt op {formatDbDateLong(request.processed_at)}
				</span>
			)}
		</div>
	);
}

type SignupRequestDialogRequest = SignupRequestDetail & {
	applicant?: SignupApplicantProfile | null;
};

function SignupRequestMainFields({ request }: { request: SignupRequestDialogRequest }) {
	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="col-span-2">
				<UserDisplay profile={signupApplicantDisplayProfile(request)} showEmail />
			</div>
			<SignupRequestField label="Lessoort" value={request.lesson_type_name} />
			<SignupRequestField label="Groep" value={request.lesson_group_name} />
			<SignupRequestField label="Telefoon" value={request.phone_number} />
			<SignupRequestField
				label="Geboortedatum"
				value={request.date_of_birth ? formatDbDateLong(request.date_of_birth) : null}
			/>
		</div>
	);
}

function SignupRequestParentSection({ request }: { request: SignupRequestDetail }) {
	if (!hasSignupRequestParentInfo(request)) return null;
	return (
		<div className="border-t pt-3">
			<p className="text-sm font-medium mb-2">Ouder/voogd</p>
			<div className="grid grid-cols-2 gap-3">
				<SignupRequestField label="Naam" value={request.parent_name} />
				<SignupRequestField label="Email" value={request.parent_email} />
				<SignupRequestField label="Telefoon" value={request.parent_phone_number} />
			</div>
		</div>
	);
}

function SignupRequestNotesSection({ request }: { request: SignupRequestDetail }) {
	if (!request.notes) return null;
	return (
		<div className="border-t pt-3">
			<p className="text-xs font-medium text-muted-foreground">Opmerkingen</p>
			<p className="text-sm whitespace-pre-line">{request.notes}</p>
		</div>
	);
}

export function SignupRequestDialogBody({ request }: { request: SignupRequestDialogRequest }) {
	return (
		<div className="space-y-4 py-2">
			<SignupRequestStatusHeader request={request} />
			<SignupRequestMainFields request={request} />
			<SignupRequestParentSection request={request} />
			<SignupRequestNotesSection request={request} />
		</div>
	);
}
