export function canGenerateSepaXml(role: string | undefined): boolean {
	return role === 'admin' || role === 'site_admin';
}

export function resolveGenerateSepaXmlForbiddenError(): { status: number; error: string } {
	return { status: 403, error: 'Geen rechten' };
}
