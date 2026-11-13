import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	buildAgreementWizardUrl,
	type SignupRequestRowBase,
	shouldSkipAgreementWizard,
} from '@/lib/signup-requests/signupRequestsPageHelpers';

interface ApproveSignupInvokeResult {
	student_user_id?: string;
	error?: string;
}

function resolveApproveSignupError(
	invokeError: { message?: string } | null,
	data: ApproveSignupInvokeResult | null | undefined,
): string | null {
	if (invokeError) {
		return invokeError.message ?? 'Fout bij verwerken';
	}
	if (data?.error) {
		return data.error;
	}
	return null;
}

export interface ProcessSignupRequestParams {
	row: SignupRequestRowBase;
	navigate: NavigateFunction;
	reload: () => void;
}

export async function processSignupRequest(params: ProcessSignupRequestParams): Promise<void> {
	const { data, error } = await supabase.functions.invoke('approve-signup-request', {
		body: { request_id: params.row.id },
	});

	const approveError = resolveApproveSignupError(error, data as ApproveSignupInvokeResult | null);
	if (approveError) {
		toast.error(approveError);
		return;
	}

	if (shouldSkipAgreementWizard(params.row.is_group_lesson, params.row.lesson_group_id)) {
		toast.success('Aanmelding verwerkt');
		params.reload();
		return;
	}

	const studentUserId = (data as ApproveSignupInvokeResult)?.student_user_id;
	if (!studentUserId) {
		toast.error('Fout bij verwerken');
		return;
	}

	params.navigate(
		buildAgreementWizardUrl({
			requestId: params.row.id,
			studentUserId,
			lessonTypeId: params.row.lesson_type_id,
			lessonTypeOptionId: params.row.lesson_type_option_id,
		}),
	);
}

export async function deleteSignupRequest(row: SignupRequestRowBase): Promise<void> {
	const { error } = await supabase.from('lesson_signup_requests').delete().eq('id', row.id);
	if (error) {
		toast.error('Kon aanmelding niet verwijderen');
		throw error;
	}
	toast.success('Aanmelding verwijderd');
}
