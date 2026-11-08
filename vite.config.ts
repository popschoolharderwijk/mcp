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

const LOCAL_SUPABASE_PROXY_TARGET = 'http://127.0.0.1:54421';

/** Native stack binds loopback only; browser reaches it via the Vite dev server. */
function localdevSupabaseProxy() {
	const paths = ['/auth', '/rest', '/storage', '/functions', '/realtime', '/mcp'];
	return Object.fromEntries(
		paths.map((prefix) => [
			prefix,
			{
				target: LOCAL_SUPABASE_PROXY_TARGET,
				changeOrigin: true,
				ws: prefix === '/realtime',
			},
		]),
	);
}

function viteServerConfig(mode: string) {
	return {
		host: '::' as const,
		port: mode === 'localdev' ? 8081 : 8080,
		strictPort: true,
		proxy: mode === 'localdev' ? localdevSupabaseProxy() : undefined,
	};
}

function vitePlugins(mode: string) {
	return [react(), mode === 'development' && componentTagger()].filter(Boolean);
}

// https://vitejs.dev/config/
// localdev uses 8081 so `bun run dev:local` can run beside `bun dev` (8080).
// Public keys: committed `.env.<mode>` (incl. `.env.localdev`). Optional VITE_* overlay from SECRETS_PATH for remote modes only.
export default defineConfig(({ mode }) => ({
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion ?? ''),
		'import.meta.env.VITE_CHANGELOG': JSON.stringify(changelogMarkdown),
		...secretViteDefines(mode),
	},
	server: viteServerConfig(mode),
	plugins: vitePlugins(mode),
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
}));
