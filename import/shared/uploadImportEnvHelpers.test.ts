import { describe, expect, it } from 'bun:test';
import { applyDbUrlPassword, orderImportSqlFileNames, readUploadImportEnv } from './uploadImportEnvHelpers';

describe('orderImportSqlFileNames', () => {
	it('keeps preferred converter order and appends extras alphabetically', () => {
		expect(
			orderImportSqlFileNames(
				['z.sql', 'teachers.sql', 'profiles.sql', 'readme.txt', 'courses.sql', 'students.sql'],
				['courses.sql', 'profiles.sql', 'students.sql', 'teachers.sql', 'agreements_courses.sql'],
			),
		).toEqual(['courses.sql', 'profiles.sql', 'students.sql', 'teachers.sql', 'z.sql']);
	});
});

describe('readUploadImportEnv', () => {
	it('rejects missing URL, DB URL, password, or missing {PASSWORD} placeholder', () => {
		expect(readUploadImportEnv({}).ok).toBe(false);
		expect(readUploadImportEnv({ SUPABASE_URL: 'https://exampledevref.supabase.co' }).ok).toBe(false);
		expect(
			readUploadImportEnv({
				SUPABASE_URL: 'https://exampledevref.supabase.co',
				SUPABASE_DB_URL: 'postgresql://u:{PASSWORD}@h/db',
			}).ok,
		).toBe(false);
		expect(
			readUploadImportEnv({
				SUPABASE_URL: 'https://exampledevref.supabase.co',
				SUPABASE_DB_URL: 'postgresql://u:secret@h/db',
				SUPABASE_DB_PASSWORD: 'secret',
			}).ok,
		).toBe(false);
	});

	it('builds a DB URL with an encoded password', () => {
		expect(
			readUploadImportEnv({
				SUPABASE_URL: 'https://exampledevref.supabase.co',
				SUPABASE_DB_URL: 'postgresql://u:{PASSWORD}@h/db',
				SUPABASE_DB_PASSWORD: 'p@ss:word',
			}),
		).toEqual({
			ok: true,
			value: {
				supabaseUrl: 'https://exampledevref.supabase.co',
				dbUrl: applyDbUrlPassword('postgresql://u:{PASSWORD}@h/db', 'p@ss:word'),
			},
		});
	});
});
