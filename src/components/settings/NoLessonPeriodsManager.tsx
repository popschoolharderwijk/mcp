import { useCallback, useEffect, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { NoLessonPeriodEditorDialog } from '@/components/settings/NoLessonPeriodsManagerParts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { useFormCrudDialogActions, useFormCrudDialogState } from '@/hooks/useFormCrudDialogState';
import { supabase } from '@/integrations/supabase/client';
import type { NoLessonPeriodListItem } from '@/lib/settings/noLessonPeriodsManagerControllerHelpers';
import {
	executeNoLessonPeriodDelete,
	executeNoLessonPeriodFetch,
	executeNoLessonPeriodSave,
} from '@/lib/settings/noLessonPeriodsManagerControllerHelpers';
import { isNoLessonPeriodFormValid } from '@/lib/settings/noLessonPeriodsManagerHelpers';
import { buildNoLessonPeriodsColumns } from '@/lib/settings/noLessonPeriodsTableColumns';

interface FormState {
	name: string;
	start_date: string;
	end_date: string;
	description: string;
}

const EMPTY_FORM: FormState = { name: '', start_date: '', end_date: '', description: '' };
const NO_LESSON_PERIOD_COLUMNS = buildNoLessonPeriodsColumns();

export function NoLessonPeriodsManager() {
	const [periods, setPeriods] = useState<NoLessonPeriodListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const crud = useFormCrudDialogState<FormState, NoLessonPeriodListItem>(EMPTY_FORM, (period) => ({
		name: period.name,
		start_date: period.start_date,
		end_date: period.end_date,
		description: period.description ?? '',
	}));
	const {
		dialogOpen,
		setDialogOpen,
		editing,
		form,
		setForm,
		setSaving,
		deleteTarget,
		setDeleteTarget,
		openCreate,
		openEdit,
	} = crud;

	const fetchPeriods = useCallback(async () => {
		const outcome = await executeNoLessonPeriodFetch(supabase);
		if (outcome.kind === 'success') {
			setPeriods(outcome.periods);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		void fetchPeriods();
	}, [fetchPeriods]);

	const isFormValid = isNoLessonPeriodFormValid(form.name, form.start_date, form.end_date);

	const handleSave = async () => {
		setSaving(true);
		const outcome = await executeNoLessonPeriodSave({
			isFormValid,
			form,
			editing,
			supabase,
		});
		setSaving(false);
		if (outcome === 'success') {
			setDialogOpen(false);
			await fetchPeriods();
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		await executeNoLessonPeriodDelete({ deleteTarget, supabase });
		setDeleteTarget(null);
		await fetchPeriods();
	};

	const dialogActions = useFormCrudDialogActions(crud, {
		isFormValid,
		onSave: handleSave,
		onDelete: handleDelete,
		deleteTitle: 'Lesvrije periode verwijderen',
		getDeleteDescription: (entity) => `Weet je zeker dat je "${entity.name}" wilt verwijderen?`,
	});

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
					<div className="space-y-1.5">
						<CardTitle>Lesvrije periodes</CardTitle>
						<CardDescription>Vakanties en andere periodes waarin geen lessen plaatsvinden.</CardDescription>
					</div>
					<Button onClick={openCreate} size="sm">
						<LuPlus className="mr-2 h-4 w-4" />
						Nieuwe periode
					</Button>
				</CardHeader>
				<CardContent>
					<DataTable
						data={periods}
						columns={NO_LESSON_PERIOD_COLUMNS}
						loading={loading}
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						searchFields={[(period) => period.name, (period) => period.description ?? undefined]}
						getRowKey={(period) => period.id}
						emptyMessage="Er zijn nog geen lesvrije periodes ingesteld."
						initialSortColumn="start_date"
						initialSortDirection="asc"
						rowActions={{
							onEdit: openEdit,
							onDelete: (period) => setDeleteTarget(period),
						}}
					/>
				</CardContent>
			</Card>

			<NoLessonPeriodEditorDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editing={editing}
				form={form}
				onFormChange={setForm}
				dialogActions={dialogActions}
			/>
		</>
	);
}
