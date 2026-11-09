export type LoginState = 'idle' | 'sending' | 'sent' | 'verifying' | 'passkey';

export function shouldAutoSendMagicLink(
	autoSent: boolean,
	isLoading: boolean,
	hasUser: boolean,
	prefilledEmail: string,
): boolean {
	return !autoSent && !isLoading && !hasUser && prefilledEmail.length > 0;
}

export function shouldRedirectLoggedInUser(isLoading: boolean, hasUser: boolean): boolean {
	return !isLoading && hasUser;
}

export function isLoginSendingState(state: LoginState): boolean {
	return state === 'idle' || state === 'sending' || state === 'passkey';
}

export function isPasskeySignInBusy(state: LoginState): boolean {
	return state === 'passkey';
}

export function isLoginFormDisabled(state: LoginState): boolean {
	return state === 'sending' || isPasskeySignInBusy(state);
}

export function resolvePasskeySignInButtonLabel(busy: boolean): string {
	return busy ? 'Passkey controleren...' : 'Inloggen met passkey';
}

export function resolveMagicLinkSubmitLabel(sending: boolean): string {
	return sending ? 'Versturen...' : 'Verstuur Magic Link';
}

export function sanitizeOtpInput(value: string): string {
	return value.replace(/\D/g, '');
}

export function canSubmitOtp(state: LoginState, otpLength: number): boolean {
	return state !== 'verifying' && otpLength >= 6;
}
