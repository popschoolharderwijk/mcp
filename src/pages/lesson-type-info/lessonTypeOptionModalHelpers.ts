import { toast } from 'sonner';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';

export type SaveOptionInModalFlow =
	| { kind: 'abort-no-editing' }
	| { kind: 'abort-validation'; message: string }
	| { kind: 'abort-duplicate' }
	| { kind: 'update-existing'; persistToDatabase: boolean }
	| { kind: 'create-new' };

export interface ResolveSaveOptionInModalFlowParams {
	editingOption: OptionRowWithKey | null;
	validationError: string | null;
	isDuplicate: boolean;
	isEditExisting: boolean;
	isEditMode: boolean;
	hasLessonType: boolean;
}

export function resolveSaveOptionInModalFlow(params: ResolveSaveOptionInModalFlowParams): SaveOptionInModalFlow {
	if (!params.editingOption) {
		return { kind: 'abort-no-editing' };
	}
	if (params.validationError) {
		return { kind: 'abort-validation', message: params.validationError };
	}
	if (params.isDuplicate) {
		return { kind: 'abort-duplicate' };
	}
	if (params.isEditExisting) {
		return {
			kind: 'update-existing',
			persistToDatabase: params.isEditMode && params.hasLessonType,
		};
	}
	return { kind: 'create-new' };
}

function shouldShowLocalUpdateSuccessToast(flow: SaveOptionInModalFlow): boolean {
	return flow.kind === 'update-existing' && !flow.persistToDatabase;
}

function shouldClearEditingOptionAfterSave(flow: SaveOptionInModalFlow, persisted: boolean): boolean {
	if (flow.kind === 'update-existing') {
		return flow.persistToDatabase ? persisted : true;
	}
	if (flow.kind === 'create-new') {
		return persisted;
	}
	return false;
}

export function buildOptionModalFormFromEditing(editingOption: OptionRowWithKey): OptionModalFormState {
	const { id: _id, tariffs: _tariffs, _newId, ...form } = editingOption;
	return form;
}

export function isEditingExistingOption(editingOption: OptionRowWithKey): boolean {
	return Boolean(editingOption.id);
}

function resolveSaveOptionAbortToast(flow: SaveOptionInModalFlow): string | null {
	if (flow.kind === 'abort-validation') {
		return flow.message;
	}
	if (flow.kind === 'abort-duplicate') {
		return 'Deze combinatie van duur en frequentie bestaat al voor deze lessoort.';
	}
	return null;
}

type RemoveOptionOutcome =
	| { kind: 'noop-no-selection' }
	| { kind: 'noop-missing-index' }
	| { kind: 'persist-delete'; optionId: string; index: number }
	| { kind: 'remove-local'; index: number };

function resolveRemoveOptionOutcome(params: {
	optionToDelete: OptionRowWithKey | null;
	index: number;
	isEditMode: boolean;
	hasLessonType: boolean;
}): RemoveOptionOutcome {
	if (!params.optionToDelete) {
		return { kind: 'noop-no-selection' };
	}
	if (params.index < 0) {
		return { kind: 'noop-missing-index' };
	}
	if (params.isEditMode && params.hasLessonType && params.optionToDelete.id) {
		return { kind: 'persist-delete', optionId: params.optionToDelete.id, index: params.index };
	}
	return { kind: 'remove-local', index: params.index };
}

async function runPersistedOptionRemoval(
	optionId: string,
	deletePersistedOption: (id: string) => Promise<boolean>,
	removePersistedOptionFromState: (id: string) => void,
	setSaving: (saving: boolean) => void,
): Promise<void> {
	setSaving(true);
	try {
		const ok = await deletePersistedOption(optionId);
		if (!ok) return;
		removePersistedOptionFromState(optionId);
		toast.success('Optie verwijderd');
	} catch (error) {
		console.error(error);
		toast.error('Fout bij verwijderen optie');
	} finally {
		setSaving(false);
	}
}

export interface RunConfirmRemoveOptionParams {
	optionToDelete: OptionRowWithKey | null;
	findOptionIndex: (option: OptionRowWithKey) => number;
	isEditMode: boolean;
	hasLessonType: boolean;
	deletePersistedOption: (id: string) => Promise<boolean>;
	removeOption: (index: number) => void;
	removePersistedOptionFromState: (id: string) => void;
	setSaving: (saving: boolean) => void;
	clearOptionToDelete: () => void;
}

export async function runConfirmRemoveOption(params: RunConfirmRemoveOptionParams): Promise<void> {
	const index = params.optionToDelete ? params.findOptionIndex(params.optionToDelete) : -1;
	const outcome = resolveRemoveOptionOutcome({
		optionToDelete: params.optionToDelete,
		index,
		isEditMode: params.isEditMode,
		hasLessonType: params.hasLessonType,
	});

	if (outcome.kind === 'noop-no-selection') return;
	if (outcome.kind === 'noop-missing-index') {
		params.clearOptionToDelete();
		return;
	}

	if (outcome.kind === 'persist-delete') {
		await runPersistedOptionRemoval(
			outcome.optionId,
			params.deletePersistedOption,
			params.removePersistedOptionFromState,
			params.setSaving,
		);
	}

	params.removeOption(outcome.index);
	params.clearOptionToDelete();
}

export interface RunSaveOptionInModalParams {
	flow: SaveOptionInModalFlow;
	editingOption: OptionRowWithKey;
	optionModalForm: OptionModalFormState;
	updateExistingOptionInForm: (
		editing: OptionRowWithKey,
		modalForm: OptionModalFormState,
	) => boolean;
	persistExistingOption: (
		editing: OptionRowWithKey,
		modalForm: OptionModalFormState,
	) => Promise<boolean>;
	persistNewOption: (
		editing: OptionRowWithKey,
		modalForm: OptionModalFormState,
	) => Promise<boolean>;
	clearEditingOption: () => void;
}

export async function runSaveOptionInModal(params: RunSaveOptionInModalParams): Promise<void> {
	const abortToast = resolveSaveOptionAbortToast(params.flow);
	if (abortToast) {
		toast.error(abortToast);
		return;
	}

	if (params.flow.kind === 'update-existing') {
		if (!params.updateExistingOptionInForm(params.editingOption, params.optionModalForm)) {
			return;
		}
		let persisted = true;
		if (params.flow.persistToDatabase) {
			persisted = await params.persistExistingOption(
				params.editingOption,
				params.optionModalForm,
			);
		} else if (shouldShowLocalUpdateSuccessToast(params.flow)) {
			toast.success('Optie bijgewerkt');
		}
		if (shouldClearEditingOptionAfterSave(params.flow, persisted)) {
			params.clearEditingOption();
		}
		return;
	}

	if (params.flow.kind === 'create-new') {
		const persisted = await params.persistNewOption(
			params.editingOption,
			params.optionModalForm,
		);
		if (shouldClearEditingOptionAfterSave(params.flow, persisted)) {
			params.clearEditingOption();
		}
	}
}
