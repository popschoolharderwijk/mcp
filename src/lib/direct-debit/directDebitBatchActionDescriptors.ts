import type { DirectDebitBatchActionKind } from '@/lib/direct-debit/directDebitBatchActionBarHelpers';
import {
	resolveDirectDebitBatchActionKinds,
	shouldDisableDirectDebitApproveAction,
} from '@/lib/direct-debit/directDebitBatchActionBarHelpers';
import type { DirectDebitBatchActionFlags } from '@/lib/direct-debit/directDebitBatchDetailContentHelpers';
import type { DirectDebitBatch } from '@/lib/direct-debit/types';

export type DirectDebitBatchActionDescriptor = {
	kind: DirectDebitBatchActionKind;
	label: string;
	variant: 'default' | 'outline';
	disabled: boolean;
};

type DescriptorContext = {
	batch: DirectDebitBatch;
	busy: boolean;
};

const INCASSO_BATCH_ACTION_DESCRIPTOR_BUILDERS: Record<
	DirectDebitBatchActionKind,
	(ctx: DescriptorContext) => Omit<DirectDebitBatchActionDescriptor, 'kind'>
> = {
	build: ({ busy }) => ({ label: 'Vul concept', variant: 'default', disabled: busy }),
	approve: ({ batch, busy }) => ({
		label: 'Goedkeuren',
		variant: 'outline',
		disabled: shouldDisableDirectDebitApproveAction(batch.item_count, busy),
	}),
	'generate-xml': ({ busy }) => ({ label: 'Genereer XML & aanbieden', variant: 'default', disabled: busy }),
	'download-xml': () => ({ label: 'Download XML', variant: 'outline', disabled: false }),
	close: () => ({ label: 'Markeer als afgerond', variant: 'outline', disabled: false }),
};

function buildDirectDebitBatchActionDescriptor(
	kind: DirectDebitBatchActionKind,
	ctx: DescriptorContext,
): DirectDebitBatchActionDescriptor {
	return { kind, ...INCASSO_BATCH_ACTION_DESCRIPTOR_BUILDERS[kind](ctx) };
}

export function buildDirectDebitBatchActionDescriptors(
	flags: DirectDebitBatchActionFlags,
	batch: DirectDebitBatch,
	busy: boolean,
): DirectDebitBatchActionDescriptor[] {
	const kinds = resolveDirectDebitBatchActionKinds(flags);
	const ctx = { batch, busy };
	return kinds.map((kind) => buildDirectDebitBatchActionDescriptor(kind, ctx));
}
