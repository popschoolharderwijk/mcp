/**
 * Script to create users in Supabase.
 * Uses Service Role Key to bypass rate limits and email confirmation.
 *
 * Supports two modes:
 * 1. Passwordless users (Magic Link / OTP only) - when no password is provided
 * 2. Password users (for dev login bypass) - when password is provided
 *
 * Multiple users: comma-separate email, first name, last name and role (same count required).
 * Password (if set) applies to every user. Empty role entry = no role for that user.
 *
 * Configure in .env:
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
 *   DEV_LOGIN_EMAIL=dev@example.com,other@example.com
 *   DEV_LOGIN_PASSWORD=your-dev-password       (optional, omit for passwordless)
 *   DEV_LOGIN_FIRST_NAME=Your,Other
 *   DEV_LOGIN_LAST_NAME=Name,Person
 *   DEV_LOGIN_ROLE=site_admin,admin
 *
 * Run: bun run create-user
 */

import { createClient } from '@supabase/supabase-js';
import { Constants } from '@/integrations/supabase/types';
import { parseCreateUsersFromEnv } from './createUserPure';

// Valid app_role values from the database enum
const VALID_ROLES = Constants.public.Enums.app_role;
type AppRole = (typeof VALID_ROLES)[number];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

const users = parseCreateUsersFromEnv({
	email: process.env.DEV_LOGIN_EMAIL,
	firstName: process.env.DEV_LOGIN_FIRST_NAME,
	lastName: process.env.DEV_LOGIN_LAST_NAME,
	role: process.env.DEV_LOGIN_ROLE,
});

for (const user of users) {
	if (user.role && !VALID_ROLES.includes(user.role as AppRole)) {
		throw new Error(`Invalid DEV_LOGIN_ROLE: "${user.role}". Valid values are: ${VALID_ROLES.join(', ')}`);
	}
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

const hasPassword = !!DEV_LOGIN_PASSWORD;

const { data: existingUsers } = await supabase.auth.admin.listUsers();

for (const user of users) {
	const user_metadata: Record<string, string> = {};
	if (user.firstName) user_metadata.first_name = user.firstName;
	if (user.lastName) user_metadata.last_name = user.lastName;

	const existingUser = existingUsers?.users.find((u) => u.email === user.email);

	let userId: string | undefined;
	let action: 'created' | 'updated';

	if (existingUser) {
		console.log(`Updating existing user: ${user.email}`);

		const mergedMetadata = { ...existingUser.user_metadata, ...user_metadata };

		const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
			password: DEV_LOGIN_PASSWORD || undefined,
			user_metadata: mergedMetadata,
		});

		if (error) {
			console.error('Error updating user:', error.message);
			process.exit(1);
		}

		if (user.firstName || user.lastName) {
			const profileUpdate: Record<string, string> = {};
			if (user.firstName) profileUpdate.first_name = user.firstName;
			if (user.lastName) profileUpdate.last_name = user.lastName;

			const { error: profileError } = await supabase
				.from('profiles')
				.update(profileUpdate)
				.eq('user_id', existingUser.id);

			if (profileError) {
				console.error('Error updating profile:', profileError.message);
				process.exit(1);
			}
		}

		userId = data.user?.id;
		action = 'updated';
	} else {
		console.log(`Creating ${hasPassword ? 'password' : 'passwordless'} user: ${user.email}`);

		const { data, error } = await supabase.auth.admin.createUser({
			email: user.email,
			email_confirm: true,
			password: DEV_LOGIN_PASSWORD || undefined,
			user_metadata,
		});

		if (error) {
			console.error('Error creating user:', error.message);
			process.exit(1);
		}

		userId = data.user?.id;
		action = 'created';
	}

	if (userId) {
		if (user.role) {
			const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);

			if (deleteError) {
				console.error('Error removing existing role:', deleteError.message);
				process.exit(1);
			}

			const { error: insertError } = await supabase.from('user_roles').insert({
				user_id: userId,
				role: user.role as AppRole,
			});

			if (insertError) {
				console.error('Error assigning role:', insertError.message);
				process.exit(1);
			}

			console.log(`Role "${user.role}" assigned to user.`);
		} else {
			const { data: existingRole } = await supabase
				.from('user_roles')
				.select('role')
				.eq('user_id', userId)
				.single();

			if (existingRole) {
				const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);

				if (deleteError) {
					console.error('Error removing role:', deleteError.message);
					process.exit(1);
				}

				console.log(`Removed existing role "${existingRole.role}" from user.`);
			}
		}
	}

	console.log(`\n✅ ${hasPassword ? 'Password' : 'Passwordless'} user ${action}!`);
	console.log('  ID:', userId);
	console.log('  Email:', user.email);
	if (user.firstName || user.lastName) {
		console.log('  Name:', [user.firstName, user.lastName].filter(Boolean).join(' '));
	}
	if (user.role) {
		console.log('  Role:', user.role);
	}
}

if (hasPassword) {
	console.log('\nThese users can login via password (dev bypass) or Magic Link / OTP.');
} else {
	console.log('\nThese users can only login via Magic Link / OTP.');
	console.log('To enable dev login bypass, set VITE_DEV_LOGIN_PASSWORD and recreate the users.');
}
