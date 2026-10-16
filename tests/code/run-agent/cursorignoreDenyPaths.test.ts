import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dir, '../../../run-agent/lib/cursorignore-deny-paths.sh');

type DenyEntry = { kind: 'dir' | 'file'; path: string };

async function collectDenyEntries(workspace: string): Promise<DenyEntry[]> {
	const proc = Bun.spawn(['bash', SCRIPT, workspace], {
		stdout: 'pipe',
		stderr: 'pipe',
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode !== 0) {
		throw new Error(`cursorignore-deny-paths failed (${exitCode}): ${stderr}`);
	}
	return stdout
		.split('\n')
		.filter((line) => line.length > 0)
		.map((line) => {
			const [kind, path] = line.split('\t');
			if (kind !== 'dir' && kind !== 'file') {
				throw new Error(`unexpected kind in line: ${line}`);
			}
			if (!path) {
				throw new Error(`missing path in line: ${line}`);
			}
			return { kind, path };
		});
}

function relEntries(workspace: string, entries: DenyEntry[]): string[] {
	return entries.map((e) => `${e.kind}:${e.path.slice(workspace.length + 1)}`).toSorted();
}

describe('collect_cursorignore_deny_entries', () => {
	const workspaces: string[] = [];

	afterEach(async () => {
		await Promise.all(workspaces.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
	});

	async function fixture(ignore: string, files: string[]): Promise<string> {
		const root = await mkdtemp(join(tmpdir(), 'cursorignore-deny-'));
		workspaces.push(root);
		await writeFile(join(root, '.cursorignore'), ignore, 'utf8');
		for (const rel of files) {
			const abs = join(root, rel);
			await mkdir(join(abs, '..'), { recursive: true });
			await writeFile(abs, 'x', 'utf8');
		}
		return root;
	}

	it('denies directory for trailing-slash patterns so new children inherit deny', async () => {
		const root = await fixture('secrets/\n', ['secrets/a.txt', 'keep.txt']);
		expect(relEntries(root, await collectDenyEntries(root))).toEqual(['dir:secrets']);
	});

	it('denies directory for import/source/* style patterns', async () => {
		const root = await fixture('import/source/*\n', ['import/source/a.jsonl', 'import/keep.txt']);
		expect(relEntries(root, await collectDenyEntries(root))).toEqual(['dir:import/source']);
	});

	it('denies directory for /** suffix patterns', async () => {
		const root = await fixture('private/**\n', ['private/nested/x.txt', 'ok.txt']);
		expect(relEntries(root, await collectDenyEntries(root))).toEqual(['dir:private']);
	});

	it('denies matching files for **/.env patterns without denying workspace root', async () => {
		const root = await fixture('**/.env\n**/.env.*\n', ['.env', '.env.local', 'src/app.ts']);
		expect(relEntries(root, await collectDenyEntries(root))).toEqual(['file:.env', 'file:.env.local']);
	});

	it('demotes directory deny when a negation overlaps so ! files stay allow-by-omission', async () => {
		const root = await fixture('secrets/*\n!secrets/public.txt\n', ['secrets/hidden.txt', 'secrets/public.txt']);
		expect(relEntries(root, await collectDenyEntries(root))).toEqual(['file:secrets/hidden.txt']);
	});

	it('collapses nested denied dirs to the parent', async () => {
		const root = await fixture('outer/\nouter/inner/\n', ['outer/inner/a.txt']);
		expect(relEntries(root, await collectDenyEntries(root))).toEqual(['dir:outer']);
	});

	it('returns no entries when .cursorignore is missing', async () => {
		const root = await mkdtemp(join(tmpdir(), 'cursorignore-empty-'));
		workspaces.push(root);
		await writeFile(join(root, 'a.txt'), 'x', 'utf8');
		expect(await collectDenyEntries(root)).toEqual([]);
	});

	it('ignores ../ directory anchors that escape the workspace', async () => {
		const parent = await mkdtemp(join(tmpdir(), 'cursorignore-escape-'));
		workspaces.push(parent);
		const outside = join(parent, 'outside');
		const root = join(parent, 'workspace');
		await mkdir(join(outside, 'secret'), { recursive: true });
		await writeFile(join(outside, 'secret', 'x.txt'), 'x', 'utf8');
		await mkdir(root, { recursive: true });
		await writeFile(join(root, '.cursorignore'), '../outside/\n', 'utf8');
		await writeFile(join(root, 'ok.txt'), 'x', 'utf8');
		expect(await collectDenyEntries(root)).toEqual([]);
	});

	it('ignores directory anchors whose path contains a symlink component', async () => {
		const parent = await mkdtemp(join(tmpdir(), 'cursorignore-symlink-'));
		workspaces.push(parent);
		const outside = join(parent, 'outside');
		const root = join(parent, 'workspace');
		await mkdir(join(outside, 'leak'), { recursive: true });
		await writeFile(join(outside, 'leak', 'x.txt'), 'x', 'utf8');
		await mkdir(root, { recursive: true });
		await writeFile(join(root, '.cursorignore'), 'via-link/\n', 'utf8');
		await symlink(outside, join(root, 'via-link'));
		expect(await collectDenyEntries(root)).toEqual([]);
	});

	it('ignores nested anchors when an intermediate path component is a symlink', async () => {
		const parent = await mkdtemp(join(tmpdir(), 'cursorignore-midlink-'));
		workspaces.push(parent);
		const outside = join(parent, 'outside');
		const root = join(parent, 'workspace');
		await mkdir(join(outside, 'nested'), { recursive: true });
		await writeFile(join(outside, 'nested', 'x.txt'), 'x', 'utf8');
		await mkdir(root, { recursive: true });
		await writeFile(join(root, '.cursorignore'), 'bridge/nested/\n', 'utf8');
		await symlink(outside, join(root, 'bridge'));
		expect(await collectDenyEntries(root)).toEqual([]);
	});
});
