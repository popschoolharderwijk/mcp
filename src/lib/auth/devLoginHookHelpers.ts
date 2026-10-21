import { DEV_ROLES, resolveStoredDevLoginValue } from '@/lib/auth/devLoginHelpers';

export function resolveDevLoginInitialValue(): string {
	if (typeof window === 'undefined') {
		return DEV_ROLES[0]?.email ?? 'site-admin@test.nl';
	}
	return resolveStoredDevLoginValue(localStorage.getItem('dev-login-selected-dev-user'));
}

export function shouldBlockDevLoginInProduction(): boolean {
	return import.meta.env.MODE === 'production';
}

export function resolveDevLoginCredentials(
	email: string | null,
): { ok: true; email: string; password: string } | { ok: false; error: string } {
	if (!email) {
		return { ok: false, error: 'Selecteer eerst een rol, docent, leerling of user' };
	}

	const password = import.meta.env.VITE_DEV_LOGIN_PASSWORD;
	if (!password) {
		return { ok: false, error: 'VITE_DEV_LOGIN_PASSWORD niet geconfigureerd in environment' };
	}

	return { ok: true, email, password };
}
