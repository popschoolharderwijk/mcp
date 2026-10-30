import type { NavigateFunction } from 'react-router-dom';
import { AgreementsDataTable, type AgreementsDataTableProps } from '@/components/agreements/AgreementsDataTable';
import { AgreementsPageCreateButton } from '@/components/agreements/AgreementsPageDialogs';
import { NavPageShell } from '@/components/ui/nav-page-shell';

interface AgreementsPageTableProps extends AgreementsDataTableProps {
	navigate: NavigateFunction;
}

export function AgreementsPageTable({ navigate, ...tableProps }: AgreementsPageTableProps) {
	return (
		<NavPageShell item="agreements" actions={<AgreementsPageCreateButton navigate={navigate} />}>
			<AgreementsDataTable {...tableProps} />
		</NavPageShell>
	);
}
