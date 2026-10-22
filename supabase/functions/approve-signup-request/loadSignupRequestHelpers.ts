import { jsonResponse } from '../_shared/http.ts';
import type { SignupRequestRow } from './types.ts';

export function validateSignupRequestStatus(status: SignupRequestRow['status']): Response | null {
	if (status !== 'pending' && status !== 'trial_scheduled') {
		return jsonResponse(409, { error: 'Aanmelding is al verwerkt' });
	}
	return null;
}
