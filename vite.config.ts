import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import { defineConfig } from 'vite';
import {
	parseEnvFileEntries,
	resolveSecretsRoot,
	runtimeEnvFileForViteMode,
	secretsFilePath,
} from './scripts/supabase/envHelpers.ts';

const packageJsonPath = path.resolve(__dirname, './package.json');
const changelogPath = path.resolve(__dirname, './CHANGELOG.md');
const projectRoot = path.resolve(__dirname);

const { version: appVersion } = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
	version?: string;
};
const changelogMarkdown = readFileSync(changelogPath, 'utf-8');

function secretsRootOrNull(): string | null {
	const pointerPath = path.join(projectRoot, '.env');
	const contents = existsSync(pointerPath) ? readFileSync(pointerPath, 'utf8') : null;
	return resolveSecretsRoot(projectRoot, process.env, contents);
}

function secretViteDefines(mode: string): Record<string, string> {
	const relativePath = runtimeEnvFileForViteMode(mode);
	const secretsRoot = secretsRootOrNull();
	if (relativePath === null || secretsRoot === null) return {};
	const path = secretsFilePath(secretsRoot, relativePath);
	if (!existsSync(path)) return {};
	const viteEntries = Object.entries(parseEnvFileEntries(readFileSync(path, 'utf8'))).filter(([key]) =>
		key.startsWith('VITE_'),
	);
	return Object.fromEntries(viteEntries.map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]));
}

// https://vitejs.dev/config/
// localdev uses 8081 so `bun run dev:local` can run beside `bun dev` (8080).
// One VITE_* overlay per mode from SECRETS_PATH (`localdev` → `.env.local`). Public keys stay in the repo mode files.
export default defineConfig(({ mode }) => ({
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion ?? ''),
		'import.meta.env.VITE_CHANGELOG': JSON.stringify(changelogMarkdown),
		...secretViteDefines(mode),
	},
	server: {
		host: '::',
		port: mode === 'localdev' ? 8081 : 8080,
		strictPort: true,
	},
	plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
}));
