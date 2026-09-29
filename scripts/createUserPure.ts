/**
 * Pure parsing/validation for bun run create-user.
 * DEV_LOGIN_EMAIL / FIRST_NAME / LAST_NAME / ROLE are comma-separated lists of equal length.
 */

export type CreateUserSpec = {
	email: string;
	firstName: string;
	lastName: string;
	role: string;
};

function splitCsv(value: string | undefined): string[] {
	if (value === undefined || value.trim() === '') {
		return [];
	}
	return value.split(',').map((part) => part.trim());
}

export function parseCreateUsersFromEnv(env: {
	email?: string;
	firstName?: string;
	lastName?: string;
	role?: string;
}): CreateUserSpec[] {
	const emails = splitCsv(env.email);
	const firstNames = splitCsv(env.firstName);
	const lastNames = splitCsv(env.lastName);
	const roles = splitCsv(env.role);

	if (emails.length === 0) {
		throw new Error('Missing DEV_LOGIN_EMAIL in environment');
	}

	if (emails.length !== firstNames.length || emails.length !== lastNames.length || emails.length !== roles.length) {
		throw new Error(
			`DEV_LOGIN_EMAIL, DEV_LOGIN_FIRST_NAME, DEV_LOGIN_LAST_NAME and DEV_LOGIN_ROLE must have the same number of comma-separated values ` +
				`(got emails=${emails.length}, firstNames=${firstNames.length}, lastNames=${lastNames.length}, roles=${roles.length})`,
		);
	}

	const emptyEmailIndex = emails.indexOf('');
	if (emptyEmailIndex !== -1) {
		throw new Error(`DEV_LOGIN_EMAIL entry at index ${emptyEmailIndex} is empty`);
	}

	return emails.map((email, index) => ({
		email,
		firstName: firstNames[index] ?? '',
		lastName: lastNames[index] ?? '',
		role: roles[index] ?? '',
	}));
}
