import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { DirectDebitBatchDetailContent } from '@/components/direct-debit/DirectDebitBatchDetailContent';
import { useDirectDebitBatchDetail } from '@/hooks/useDirectDebitBatchDetail';
import { resolveDirectDebitBatchDetailView } from '@/lib/direct-debit/directDebitBatchDetailHelpers';

export default function DirectDebitBatchDetail() {
	return (
		<AdminSiteGuard>
			<Detail />
		</AdminSiteGuard>
	);
}

function Detail() {
	const detail = useDirectDebitBatchDetail();
	const view = resolveDirectDebitBatchDetailView(detail.loading, detail.batch);

	if (view === 'loading') {
		return <div className="p-8 text-center text-muted-foreground">Laden...</div>;
	}

	if (view === 'not-found' || !detail.batch) {
		return <div className="p-8 text-center text-muted-foreground">Batch niet gevonden</div>;
	}

	return (
		<DirectDebitBatchDetailContent
			batch={detail.batch}
			items={detail.items}
			busy={detail.busy}
			itemStatusEditable={detail.itemStatusEditable}
			onBuild={() => {
				void detail.handleBuild();
			}}
			onApprove={() => {
				void detail.handleApprove();
			}}
			onGenerateXml={() => {
				void detail.handleGenerateXml();
			}}
			onClose={() => {
				void detail.handleClose();
			}}
			onDownloadXml={(path) => {
				void detail.downloadXml(path);
			}}
			onUpdateItemStatus={(itemId, status) => {
				void detail.handleUpdateItemStatus(itemId, status);
			}}
		/>
	);
}
