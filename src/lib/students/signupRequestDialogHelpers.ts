import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';

export type SignupRequestStatusVariant = 'default' | 'secondary' | 'outline';

export function resolveSignupRequestStatusVariant(status: SignupRequestDetail['status']): SignupRequestStatusVariant {
	if (status === 'pending') return 'default';
	if (status === 'approved') return 'secondary';
	return 'outline';
}

export function hasSignupRequestParentInfo(request: SignupRequestDetail): boolean {
	return Boolean(request.parent_name || request.parent_email || request.parent_phone_number);
}
