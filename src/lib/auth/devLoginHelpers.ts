export interface DevUser {
	email: string;
	firstName: string;
	description?: string;
}

export const DEV_TEACHERS: DevUser[] = [
	{ email: 'teacher-alice@test.nl', firstName: 'Alice', description: 'Veel leerlingen' },
	{ email: 'teacher-jack@test.nl', firstName: 'Jacques', description: 'Geen leerlingen' },
	{ email: 'teacher-eve@test.nl', firstName: 'Eva', description: 'Bandcoaching' },
];

export const DEV_STUDENTS: DevUser[] = [
	{ email: 'student-001@test.nl', firstName: 'Lucas', description: 'Bandcoaching' },
	{ email: 'student-009@test.nl', firstName: 'Luuk', description: 'Gitaar (Alice + Frank)' },
	{ email: 'student-010@test.nl', firstName: 'Bram', description: 'Gitaar (Alice + Frank)' },
];

/** Shared-login parent (seed: Emma + Lars as members). */
export const DEV_SHARED_LOGINS: DevUser[] = [
	{ email: 'parent-shared@test.nl', firstName: 'Karin', description: 'Ouder, 2 kinderen' },
];

export const DEV_USERS: DevUser[] = [
	{ email: 'user-001@test.nl', firstName: 'Koen' },
	{ email: 'user-002@test.nl', firstName: 'Rik' },
	{ email: 'user-003@test.nl', firstName: 'Tim' },
];

export const DEV_ROLES: DevUser[] = [
	{ email: 'site-admin@test.nl', firstName: 'Jan-Willem', description: 'Site Admin' },
	{ email: 'admin-one@test.nl', firstName: 'Sophie', description: 'Admin' },
	{ email: 'staff-one@test.nl', firstName: 'Lisa', description: 'Medewerker' },
];

function getAllDevLoginEmails(): string[] {
	return [...DEV_ROLES, ...DEV_TEACHERS, ...DEV_STUDENTS, ...DEV_SHARED_LOGINS, ...DEV_USERS].map(
		(user) => user.email,
	);
}

export function resolveStoredDevLoginValue(storedDevUser: string | null): string {
	const allDevEmails = getAllDevLoginEmails();
	if (storedDevUser && allDevEmails.includes(storedDevUser)) {
		return storedDevUser;
	}
	return DEV_ROLES[0]?.email ?? 'site-admin@test.nl';
}

export function persistDevLoginSelection(selectedValue: string): void {
	localStorage.setItem('dev-login-selected-dev-user', selectedValue);
}

export function resolveDevLoginEmail(value: string): string | null {
	return getAllDevLoginEmails().includes(value) ? value : null;
}

export function getDevLoginErrorMessage(errorMessage: string, email: string): string {
	if (errorMessage.includes('Invalid login credentials')) {
		return `Inloggen mislukt voor ${email}. Controleer VITE_DEV_LOGIN_PASSWORD.`;
	}
	return `${errorMessage} (email: ${email})`;
}

export function formatDevLoginSelectLabel(user: DevUser): string {
	if (user.description) {
		return `${user.firstName} (${user.description})`;
	}
	return user.firstName;
}
