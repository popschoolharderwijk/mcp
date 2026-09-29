import { Button } from '@/components/ui/button';
import {
	resolveDirectDebitBatchActionHandler,
	resolveDirectDebitBatchActionIcon,
} from '@/lib/direct-debit/directDebitBatchActionBarHelpers';
import { buildDirectDebitBatchActionDescriptors } from '@/lib/direct-debit/directDebitBatchActionDescriptors';
import type { DirectDebitBatchActionFlags } from '@/lib/direct-debit/directDebitBatchDetailContentHelpers';
import type { DirectDebitBatch } from '@/lib/direct-debit/types';

interface DirectDebitBatchActionBarProps {
	batch: DirectDebitBatch;
	busy: boolean;
	flags: DirectDebitBatchActionFlags;
	onBuild: () => void;
	onApprove: () => void;
	onGenerateXml: () => void;
	onClose: () => void;
	onDownloadXml: (path: string) => void;
}

export function DirectDebitBatchActionBar(props: DirectDebitBatchActionBarProps) {
	const { batch, busy, flags } = props;
	const actions = buildDirectDebitBatchActionDescriptors(flags, batch, busy);

	return (
		<div className="flex flex-wrap gap-2">
			{actions.map((action) => {
				const Icon = resolveDirectDebitBatchActionIcon(action.kind);
				return (
					<Button
						key={action.kind}
						variant={action.variant}
						onClick={resolveDirectDebitBatchActionHandler(action.kind, props)}
						disabled={action.disabled}
					>
						{Icon ? <Icon className="h-4 w-4 mr-2" /> : null}
						{action.label}
					</Button>
				);
			})}
		</div>
	);
}
