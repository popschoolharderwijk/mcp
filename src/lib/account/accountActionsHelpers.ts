export type DeleteAccountToastKind = 'last-site-admin' | 'session-expired' | 'generic-error';

export function resolveDeleteAccountToastKind(error: string, code?: string): DeleteAccountToastKind {
	if (code === 'last_site_admin') return 'last-site-admin';
	if (error === 'Sessie verlopen') return 'session-expired';
	return 'generic-error';
}
