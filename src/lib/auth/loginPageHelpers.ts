import type { LoginState } from '@/lib/auth/loginHelpers';

function buildMagicLinkRedirectUrl(origin: string): string {
	return `${origin}/auth/callback`;
}

export function buildMagicLinkSignInOptions(origin: string) {
	return {
		shouldCreateUser: false,
		emailRedirectTo: buildMagicLinkRedirectUrl(origin),
	};
}

export function resolveLoginViewMode(state: LoginState): 'magic-link' | 'otp' {
	return state === 'idle' || state === 'sending' || state === 'passkey' ? 'magic-link' : 'otp';
}

export type LoginPageContent = 'redirect' | 'loading' | 'form';

export function resolveLoginPageContent(shouldRedirect: boolean, showLoadingScreen: boolean): LoginPageContent {
	if (shouldRedirect) return 'redirect';
	if (showLoadingScreen) return 'loading';
	return 'form';
}
