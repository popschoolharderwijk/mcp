import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ExistingOrNewUserSelect } from '@/components/ui/existing-or-new-user-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type LessonTypeOption, LessonTypeSelector } from '@/components/ui/lesson-type-selector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PhoneInput } from '@/components/ui/phone-input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import {
	createInitialTeacherFormState,
	loadTeacherFormUserData,
	useTeacherFormDialogData,
} from '@/hooks/useTeacherFormDialogData';
import { EMPTY_TEACHER_FORM, type TeacherFormState } from '@/lib/teachers/teacherFormDialogHelpers';
import {
	resolveTeacherFormDialogCopy,
	resolveTeacherFormSubmitDisabled,
	resolveTeacherFormSubmitLabel,
} from '@/lib/teachers/teacherFormDialogShellHelpers';
import { executeTeacherFormDialogSubmit } from '@/lib/teachers/teacherFormDialogSubmit';
import type { Teacher } from '@/types/teachers';

interface TeacherFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: (teacherUserId?: string) => void;
	teacher?: Teacher;
}

function TeacherEditFields({
	form,
	setForm,
	isEditMode,
}: {
	form: TeacherFormState;
	setForm: (form: TeacherFormState) => void;
	isEditMode: boolean;
}) {
	return (
		<>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label htmlFor="teacher-first-name" className="text-sm">
						Voornaam
					</Label>
					<Input
						id="teacher-first-name"
						value={form.first_name}
						onChange={(event) => setForm({ ...form, first_name: event.target.value })}
						className="h-9"
						autoFocus
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="teacher-last-name" className="text-sm">
						Achternaam
					</Label>
					<Input
						id="teacher-last-name"
						value={form.last_name}
						onChange={(event) => setForm({ ...form, last_name: event.target.value })}
						className="h-9"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label htmlFor="teacher-email" className="text-sm">
						Email *
					</Label>
					<Input
						id="teacher-email"
						type="email"
						value={form.email}
						onChange={(event) => setForm({ ...form, email: event.target.value })}
						placeholder="docent@voorbeeld.nl"
						disabled={isEditMode}
						className="h-9"
					/>
					{isEditMode && <p className="text-xs text-muted-foreground">Email kan niet worden gewijzigd.</p>}
				</div>
				<div className="space-y-1.5">
					<PhoneInput
						id="teacher-phone-number"
						label="Telefoonnummer"
						value={form.phone_number}
						onChange={(value) => setForm({ ...form, phone_number: value })}
					/>
				</div>
			</div>
		</>
	);
}

function TeacherLessonTypeSelector({
	loadingLessonTypes,
	lessonTypes,
	selectedIds,
	onChange,
}: {
	loadingLessonTypes: boolean;
	lessonTypes: LessonTypeOption[];
	selectedIds: string[];
	onChange: (selectedIds: string[]) => void;
}) {
	if (loadingLessonTypes) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
				<LoadingSpinner size="md" label="Lessoorten laden..." />
			</div>
		);
	}
	if (lessonTypes.length === 0) {
		return <p className="text-sm text-muted-foreground py-2">Geen actieve lessoorten beschikbaar.</p>;
	}
	return (
		<LessonTypeSelector
			value={selectedIds}
			onChange={onChange}
			options={lessonTypes}
			placeholder="Selecteer lessoorten..."
			searchPlaceholder="Zoek lessoort..."
		/>
	);
}

export function TeacherFormDialog({ open, onOpenChange, onSuccess, teacher }: TeacherFormDialogProps) {
	const isEditMode = Boolean(teacher);
	const [form, setForm] = useState<TeacherFormState>(EMPTY_TEACHER_FORM);
	const [saving, setSaving] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const { lessonTypes, loadingLessonTypes, teacherUserIds } = useTeacherFormDialogData(open, teacher, setForm);

	useEffect(() => {
		if (!open) return;
		setForm(createInitialTeacherFormState(open, teacher));
		setSelectedUserId(null);
	}, [open, teacher]);

	const handleOpenChange = (newOpen: boolean) => {
		if (saving) return;
		if (!newOpen) {
			setForm(EMPTY_TEACHER_FORM);
			setSelectedUserId(null);
		}
		onOpenChange(newOpen);
	};

	const handleSubmit = async () => {
		setSaving(true);
		try {
			const outcome = await executeTeacherFormDialogSubmit({
				isEditMode,
				teacher,
				selectedUserId,
				form,
			});

			if (outcome.kind === 'validation-failed' || outcome.kind === 'action-failed') {
				return;
			}

			if (outcome.kind === 'create-success') {
				onSuccess(outcome.userId);
			} else {
				onSuccess();
			}

			setForm(EMPTY_TEACHER_FORM);
			setSelectedUserId(null);
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	const dialogCopy = resolveTeacherFormDialogCopy(isEditMode, form);
	const submitLabels = resolveTeacherFormSubmitLabel(isEditMode);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
				<DialogHeader className="pb-2">
					<DialogTitle className="text-lg">{dialogCopy.title}</DialogTitle>
					{dialogCopy.description && (
						<DialogDescription className="text-sm">{dialogCopy.description}</DialogDescription>
					)}
				</DialogHeader>
				<div className="space-y-3 py-2">
					{!isEditMode && (
						<ExistingOrNewUserSelect
							value={selectedUserId}
							onChange={(selectedUser) => {
								setSelectedUserId(selectedUser?.user_id ?? null);
								if (selectedUser) {
									void loadTeacherFormUserData(selectedUser.user_id).then(setForm);
								} else {
									setForm(EMPTY_TEACHER_FORM);
								}
							}}
							filter="all"
							excludeUserIds={teacherUserIds}
							placeholder="Selecteer een bestaande gebruiker..."
							label="Gebruiker"
							required
						/>
					)}

					{isEditMode && <TeacherEditFields form={form} setForm={setForm} isEditMode={isEditMode} />}

					<div className="space-y-1.5">
						<Label htmlFor="teacher-bio" className="text-sm">
							Bio
						</Label>
						<Textarea
							id="teacher-bio"
							value={form.bio}
							onChange={(event) => setForm({ ...form, bio: event.target.value })}
							placeholder="Korte beschrijving van de docent..."
							rows={2}
							className="min-h-[50px]"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-sm">Lessoorten</Label>
						<TeacherLessonTypeSelector
							loadingLessonTypes={loadingLessonTypes}
							lessonTypes={lessonTypes}
							selectedIds={form.lesson_type_ids}
							onChange={(selectedIds) => setForm({ ...form, lesson_type_ids: selectedIds })}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
						Annuleren
					</Button>
					<SubmitButton
						variant="default"
						onClick={handleSubmit}
						loading={saving}
						loadingLabel={submitLabels.loading}
						disabled={resolveTeacherFormSubmitDisabled(isEditMode, form, selectedUserId)}
					>
						{submitLabels.idle}
					</SubmitButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
