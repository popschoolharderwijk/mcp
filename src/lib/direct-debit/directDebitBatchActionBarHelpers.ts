import type { IconType } from 'react-icons';
import { LuDownload, LuFileCog, LuRefreshCw } from 'react-icons/lu';
import type { DirectDebitBatchActionFlags } from '@/lib/direct-debit/directDebitBatchDetailContentHelpers';

export type DirectDebitBatchActionKind = 'build' | 'approve' | 'generate-xml' | 'download-xml' | 'close';

export function resolveDirectDebitBatchActionKinds(flags: DirectDebitBatchActionFlags): DirectDebitBatchActionKind[] {
	const actions: DirectDebitBatchActionKind[] = [];
	if (flags.showDraftActions) {
		actions.push('build', 'approve');
	}
	if (flags.showGenerateXml) actions.push('generate-xml');
	if (flags.showDownloadXml) actions.push('download-xml');
	if (flags.showClose) actions.push('close');
	return actions;
}

export function shouldDisableDirectDebitApproveAction(itemCount: number, busy: boolean): boolean {
	return busy || itemCount === 0;
}

const INCASSO_BATCH_ACTION_ICON_MAP: Partial<Record<DirectDebitBatchActionKind, IconType>> = {
	build: LuRefreshCw,
	'generate-xml': LuFileCog,
	'download-xml': LuDownload,
};

export type DirectDebitBatchActionHandlers = {
	onBuild: () => void;
	onApprove: () => void;
	onGenerateXml: () => void;
	onClose: () => void;
	onDownloadXml: (path: string) => void;
	batch: { xml_storage_path: string | null };
};

export function resolveDirectDebitBatchActionIcon(kind: DirectDebitBatchActionKind): IconType | null {
	return INCASSO_BATCH_ACTION_ICON_MAP[kind] ?? null;
}

export function resolveDirectDebitBatchActionHandler(
	kind: DirectDebitBatchActionKind,
	handlers: DirectDebitBatchActionHandlers,
): () => void {
	if (kind === 'build') return handlers.onBuild;
	if (kind === 'approve') return handlers.onApprove;
	if (kind === 'generate-xml') return handlers.onGenerateXml;
	if (kind === 'download-xml') {
		return () => handlers.onDownloadXml(handlers.batch.xml_storage_path as string);
	}
	return handlers.onClose;
}
