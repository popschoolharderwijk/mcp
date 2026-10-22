import { LuLoaderCircle } from 'react-icons/lu';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { resolveLessonTypeInfoViewState } from '@/lib/lesson-types/lessonTypeInfoPageHelpers';
import { LessonTypeFormCard } from '@/pages/lesson-type-info/LessonTypeFormCard';
import { LessonTypeOptionsPanel } from '@/pages/lesson-type-info/LessonTypeOptionsPanel';
import { useLessonTypeInfoPage } from '@/pages/lesson-type-info/useLessonTypeInfoPage';

export default function LessonTypeInfo() {
	const vm = useLessonTypeInfoPage();
	const viewState = resolveLessonTypeInfoViewState({
		authLoading: vm.authLoading,
		hasAccess: vm.hasAccess,
		isEditMode: vm.isEditMode,
		loading: vm.loading,
		id: vm.id,
		hasLessonType: Boolean(vm.lessonType),
	});

	if (viewState === 'redirect') {
		return <Navigate to="/" replace />;
	}

	if (viewState === 'loading') {
		return (
			<div className="flex items-center justify-center py-12">
				<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader title={vm.lessonTypeTitle} />

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="min-w-0">
					<LessonTypeFormCard
						form={vm.form}
						setForm={vm.setForm}
						onSubmit={vm.submit.handleSubmit}
						canSubmit={vm.submit.canSubmit}
						submitting={vm.saving}
						submitLabel={vm.submit.submitLabel}
						savingLabel={vm.submit.savingLabel}
					/>
				</div>

				<div className="min-w-0">
					<LessonTypeOptionsPanel
						sortedOptionsForm={vm.sortedOptionsForm}
						optionColumns={vm.optionColumns}
						getOptionRowKey={vm.getOptionRowKey}
						onAddOption={vm.optionModal.addOption}
						onEditOption={vm.optionModal.setEditingOption}
						onDeleteOption={vm.optionModal.setOptionToDelete}
						editingOption={vm.optionModal.editingOption}
						onCloseEditModal={() => vm.optionModal.setEditingOption(null)}
						optionModalForm={vm.optionModal.optionModalForm}
						setOptionModalForm={vm.optionModal.setOptionModalForm}
						onSaveOption={vm.optionModal.saveOptionInModal}
						optionToDelete={vm.optionModal.optionToDelete}
						onCloseDeleteDialog={() => vm.optionModal.setOptionToDelete(null)}
						onConfirmDelete={vm.optionModal.confirmRemoveOption}
						saving={vm.saving}
					/>
				</div>
			</div>
		</div>
	);
}
