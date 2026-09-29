import { useCallback, useEffect, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { NoLessonPeriodEditorDialog, NoLessonPeriodsList } from '@/components/settings/NoLessonPeriodsManagerParts';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useFormCrudDialogActions, useFormCrudDialogState } from '@/hooks/useFormCrudDialogState';
import { supabase } from '@/integrations/supabase/client';
import type { NoLessonPeriodListItem } from '@/lib/settings/noLessonPeriodsManagerControllerHelpers';
import {
	executeNoLessonPeriodDelete,
	executeNoLessonPeriodFetch,
	executeNoLessonPeriodSave,
} from '@/lib/settings/noLessonPeriodsManagerControllerHelpers';
import { isNoLessonPeriodFormValid } from '@/lib/settings/noLessonPeriodsManagerHelpers';
import {
	shouldShowNoLessonPeriodsEmpty,
	shouldShowNoLessonPeriodsList,
} from '@/lib/settings/noLessonPeriodsViewHelpers';

interface FormState {
	name: string;
	start_date: string;
	end_date: string;
	description: string;
}

const EMPTY_FORM: FormState = { name: '', start_date: '', end_date: '', description: '' };

export function NoLessonPeriodsManager() {
	const [periods, setPeriods] = useState<NoLessonPeriodListItem[]>([]);
	const [loading, setLoading] = useState(true);
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
			<PageShell
				title={NAV_LABELS.noLessonPeriods}
				description="Beheer periodes waarin geen lessen plaatsvinden"
				actions={
					<Button onClick={openCreate} size="sm">
						<LuPlus className="mr-2 h-4 w-4" />
						Nieuwe periode
					</Button>
				}
			>
				{loading && <p className="text-sm text-muted-foreground">Laden...</p>}
				{shouldShowNoLessonPeriodsEmpty(loading, periods.length) && (
					<p className="text-sm text-muted-foreground">Er zijn nog geen lesvrije periodes ingesteld.</p>
				)}
				{shouldShowNoLessonPeriodsList(loading, periods.length) && (
					<NoLessonPeriodsList periods={periods} onEdit={openEdit} onDelete={setDeleteTarget} />
				)}
			</PageShell>

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
