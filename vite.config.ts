import { readFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import { defineConfig } from 'vite';

const packageJsonPath = path.resolve(__dirname, './package.json');
const changelogPath = path.resolve(__dirname, './CHANGELOG.md');

const { version: appVersion } = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
	version?: string;
};
const changelogMarkdown = readFileSync(changelogPath, 'utf-8');

// https://vitejs.dev/config/
// localdev uses 8081 so `bun run dev:local` can run beside `bun dev` (8080).
export default defineConfig(({ mode }) => ({
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion ?? ''),
		'import.meta.env.VITE_CHANGELOG': JSON.stringify(changelogMarkdown),
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
