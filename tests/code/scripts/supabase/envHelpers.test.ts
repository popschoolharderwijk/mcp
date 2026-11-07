import { describe, expect, it } from 'bun:test';
import {
	buildLocalSupabaseDotEnv,
	confirmTargetToken,
	edgeSecretsEnvFile,
	envEntriesEqual,
	isReservedSecretName,
	matchesConfirmTargetToken,
	mergeRuntimeEnv,
	missingRequiredSecretNames,
	PUSH_ALL_STEPS,
	parseConfirmMode,
	parseDeployEnv,
	parseEnvFileEntries,
	parseEnvFileKeys,
	parseSecretsListJson,
	parseYesNoAnswer,
	pickDbPassword,
	REQUIRED_SECRET_NAMES,
	resolveDeployTarget,
	runtimeEnvFile,
	staleSecretNames,
} from '../../../../scripts/supabase/envHelpers.ts';

describe('parseDeployEnv', () => {
	it('defaults missing or empty arg to local', () => {
		expect(parseDeployEnv(undefined)).toBe('local');
		expect(parseDeployEnv('')).toBe('local');
	});

	it('accepts each known environment', () => {
		expect(parseDeployEnv('local')).toBe('local');
		expect(parseDeployEnv('development')).toBe('development');
		expect(parseDeployEnv('test')).toBe('test');
		expect(parseDeployEnv('production')).toBe('production');
	});

	it('returns null for invalid environments', () => {
		expect(parseDeployEnv('staging')).toBeNull();
		expect(parseDeployEnv('dev')).toBeNull();
		expect(parseDeployEnv('prod')).toBeNull();
		expect(parseDeployEnv('linked')).toBeNull();
	});
});

describe('edgeSecretsEnvFile and runtimeEnvFile', () => {
	it('infers paths from the target name', () => {
		expect(edgeSecretsEnvFile('local')).toBe('supabase/functions/.env.local');
		expect(edgeSecretsEnvFile('development')).toBe('supabase/functions/.env.development');
		expect(edgeSecretsEnvFile('test')).toBe('supabase/functions/.env.test');
		expect(edgeSecretsEnvFile('production')).toBe('supabase/functions/.env.production');
		expect(runtimeEnvFile('local')).toBe('.env.local');
		expect(runtimeEnvFile('development')).toBe('.env.development.local');
		expect(runtimeEnvFile('test')).toBe('.env.test.local');
		expect(runtimeEnvFile('production')).toBe('.env.production.local');
	});
});

describe('resolveDeployTarget', () => {
	it('maps CLI envs to inferred paths, remote refs, and confirm modes', () => {
		expect(resolveDeployTarget('local')).toMatchObject({
			env: 'local',
			projectRef: null,
			envFile: 'supabase/functions/.env.local',
			runtimeEnvFile: '.env.local',
		});
		expect(resolveDeployTarget('development')).toMatchObject({
			env: 'development',
			projectRef: 'zdvscmogkfyddnnxzkdu',
			envFile: 'supabase/functions/.env.development',
			runtimeEnvFile: '.env.development.local',
			confirm: 'confirmYes',
		});
		expect(resolveDeployTarget('test')).toMatchObject({
			env: 'test',
			projectRef: 'jserlqacarlgtdzrblic',
			envFile: 'supabase/functions/.env.test',
			runtimeEnvFile: '.env.test.local',
		});
		expect(resolveDeployTarget('production')).toMatchObject({
			env: 'production',
			projectRef: 'bnagepkxryauifzyoxgo',
			envFile: 'supabase/functions/.env.production',
			runtimeEnvFile: '.env.production.local',
			confirm: 'confirmTarget',
		});
	});
});

describe('parseConfirmMode', () => {
	it('accepts confirmYes and confirmTarget', () => {
		expect(parseConfirmMode('confirmYes')).toBe('confirmYes');
		expect(parseConfirmMode('confirmTarget')).toBe('confirmTarget');
	});

	it('rejects unknown values', () => {
		expect(parseConfirmMode(true)).toBeNull();
		expect(parseConfirmMode('yes')).toBeNull();
		expect(parseConfirmMode(undefined)).toBeNull();
	});
});

describe('confirmTargetToken', () => {
	it('uses local for Docker and the project ref for remotes', () => {
		expect(confirmTargetToken(resolveDeployTarget('local'))).toBe('local');
		expect(confirmTargetToken(resolveDeployTarget('production'))).toBe('bnagepkxryauifzyoxgo');
	});
});

describe('matchesConfirmTargetToken', () => {
	it('accepts an exact trimmed match and rejects other input', () => {
		expect(matchesConfirmTargetToken(' bnagepkxryauifzyoxgo ', 'bnagepkxryauifzyoxgo')).toBe(true);
		expect(matchesConfirmTargetToken('local', 'local')).toBe(true);
		expect(matchesConfirmTargetToken('LOCAL', 'local')).toBe(false);
		expect(matchesConfirmTargetToken('bnage', 'bnagepkxryauifzyoxgo')).toBe(false);
	});
});

describe('mergeRuntimeEnv', () => {
	it('lets runtime file entries override process env', () => {
		expect(
			mergeRuntimeEnv(
				{ SUPABASE_DB_PASSWORD: 'from-process', OTHER: 'keep' },
				{ SUPABASE_DB_PASSWORD: 'from-file' },
			),
		).toEqual({ SUPABASE_DB_PASSWORD: 'from-file', OTHER: 'keep' });
	});
});

describe('pickDbPassword', () => {
	it('reads plain SUPABASE_DB_PASSWORD', () => {
		expect(pickDbPassword({ SUPABASE_DB_PASSWORD: ' from-file ' })).toBe('from-file');
		expect(pickDbPassword({ SUPABASE_DB_PASSWORD_TEST: 'ignored' })).toBeNull();
		expect(pickDbPassword({})).toBeNull();
	});
});

describe('parseEnvFileKeys and parseEnvFileEntries', () => {
	const sample = `
# comment
RESEND_API_KEY=re_abc
RESEND_FROM_EMAIL="noreply@example.com"
EMPTY=
=novalue
STRIPE_SECRET_KEY='sk_test_x'
`;

	it('parses keys and skips blanks, comments, and invalid lines', () => {
		expect(parseEnvFileKeys(sample)).toEqual(['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'EMPTY', 'STRIPE_SECRET_KEY']);
	});

	it('parses entries and strips matching quotes', () => {
		expect(parseEnvFileEntries(sample)).toEqual({
			RESEND_API_KEY: 're_abc',
			RESEND_FROM_EMAIL: 'noreply@example.com',
			EMPTY: '',
			STRIPE_SECRET_KEY: 'sk_test_x',
		});
	});
});

describe('missingRequiredSecretNames', () => {
	it('returns empty when all required secrets are non-empty', () => {
		const entries: Record<string, string> = {};
		for (const name of REQUIRED_SECRET_NAMES) {
			entries[name] = 'value';
		}
		expect(missingRequiredSecretNames(entries)).toEqual([]);
	});

	it('lists missing and blank required secrets in required order', () => {
		expect(
			missingRequiredSecretNames({
				RESEND_API_KEY: '  ',
				STRIPE_SECRET_KEY: 'sk_test',
			}),
		).toEqual(['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'STRIPE_WEBHOOK_SECRET']);
	});
});

describe('staleSecretNames', () => {
	it('keeps desired custom secrets and drops orphans', () => {
		expect(
			staleSecretNames(
				['RESEND_API_KEY', 'LOVABLE_API_KEY', 'VITE_OLD'],
				['RESEND_API_KEY', 'STRIPE_SECRET_KEY'],
			),
		).toEqual(['LOVABLE_API_KEY', 'VITE_OLD']);
	});

	it('never marks SUPABASE_* names as stale', () => {
		expect(isReservedSecretName('SUPABASE_URL')).toBe(true);
		expect(isReservedSecretName('RESEND_API_KEY')).toBe(false);
		expect(
			staleSecretNames(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OLD_CUSTOM'], ['RESEND_API_KEY']),
		).toEqual(['OLD_CUSTOM']);
	});

	it('returns empty when remote matches desired', () => {
		expect(staleSecretNames(['A', 'B'], ['A', 'B'])).toEqual([]);
	});
});

describe('parseSecretsListJson', () => {
	it('parses string arrays and name objects', () => {
		expect(parseSecretsListJson('["A","B"]')).toEqual(['A', 'B']);
		expect(parseSecretsListJson('[{"name":"RESEND_API_KEY"},{"name":"STRIPE_SECRET_KEY"}]')).toEqual([
			'RESEND_API_KEY',
			'STRIPE_SECRET_KEY',
		]);
	});

	it('returns empty for blank input and throws for non-arrays', () => {
		expect(parseSecretsListJson('')).toEqual([]);
		expect(parseSecretsListJson('   ')).toEqual([]);
		expect(() => parseSecretsListJson('{"name":"x"}')).toThrow('secrets list JSON must be an array');
	});
});

describe('buildLocalSupabaseDotEnv', () => {
	it('trims RESEND_API_KEY into the Auth SMTP env entries', () => {
		expect(parseEnvFileEntries(buildLocalSupabaseDotEnv({ RESEND_API_KEY: ' re_local ' }))).toEqual({
			RESEND_API_KEY: 're_local',
		});
	});
});

describe('envEntriesEqual', () => {
	it('returns true for the same keys and values regardless of key order', () => {
		expect(envEntriesEqual({ A: '1', B: '2' }, { B: '2', A: '1' })).toBe(true);
	});

	it('returns false when a value differs, a key is missing, or an extra key exists', () => {
		expect(envEntriesEqual({ A: '1' }, { A: '2' })).toBe(false);
		expect(envEntriesEqual({ A: '1', B: '2' }, { A: '1' })).toBe(false);
		expect(envEntriesEqual({ A: '1' }, { A: '1', B: '2' })).toBe(false);
	});
});

describe('PUSH_ALL_STEPS', () => {
	it('runs migrations then secrets then config then functions', () => {
		expect(PUSH_ALL_STEPS).toEqual(['migrations', 'secrets', 'config', 'functions']);
	});
});

describe('parseYesNoAnswer', () => {
	it('accepts yes variants and rejects no variants', () => {
		expect(parseYesNoAnswer('y', false)).toBe(true);
		expect(parseYesNoAnswer('YES', false)).toBe(true);
		expect(parseYesNoAnswer('n', true)).toBe(false);
		expect(parseYesNoAnswer('No', true)).toBe(false);
	});

	it('uses defaultYes for blank and unknown answers', () => {
		expect(parseYesNoAnswer('', true)).toBe(true);
		expect(parseYesNoAnswer('   ', false)).toBe(false);
		expect(parseYesNoAnswer('maybe', true)).toBe(true);
		expect(parseYesNoAnswer('maybe', false)).toBe(false);
	});
});
