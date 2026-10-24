import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type Announcement, type AnnouncementAudience, useAnnouncements } from '@/hooks/useAnnouncements';
import { useFormCrudDialogActions, useFormCrudDialogState } from '@/hooks/useFormCrudDialogState';
import { supabase } from '@/integrations/supabase/client';
import { runAnnouncementImageUpload } from '@/lib/settings/announcementsImageUploadHelpers';
import { runAnnouncementSave } from '@/lib/settings/announcementsManagerControllerHelpers';
import { audienceFromFormFlags, isAnnouncementFormValid } from '@/lib/settings/announcementsManagerHelpers';
import { insertSnippetIntoTextarea } from '@/lib/text/insertTextAtCursorHelpers';

interface AnnouncementFormState {
	title: string;
	body: string;
	audienceTeachers: boolean;
	audienceStudents: boolean;
	publish: boolean;
}

const EMPTY_ANNOUNCEMENT_FORM: AnnouncementFormState = {
	title: '',
	body: '',
	audienceTeachers: true,
	audienceStudents: true,
	publish: true,
};

export function useAnnouncementsManager() {
	const { announcements, isLoading, error, isSchemaMissing, refetch } = useAnnouncements();
	const crud = useFormCrudDialogState<AnnouncementFormState, Announcement>(EMPTY_ANNOUNCEMENT_FORM, (a) => ({
		title: a.title,
		body: a.body,
		audienceTeachers: a.audience.includes('teachers'),
		audienceStudents: a.audience.includes('students'),
		publish: a.published_at !== null,
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
	const [uploading, setUploading] = useState(false);
	const bodyRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const insertAtCursor = useCallback(
		(snippet: string) => {
			const el = bodyRef.current;
			if (!el) {
				setForm((f) => ({ ...f, body: f.body + snippet }));
				return;
			}
			const { nextValue, caret } = insertSnippetIntoTextarea(el, el.value, snippet);
			setForm((f) => ({ ...f, body: nextValue }));
			requestAnimationFrame(() => {
				el.focus();
				el.setSelectionRange(caret, caret);
			});
		},
		[setForm],
	);

	const handleInsertLink = () => {
		const url = window.prompt('URL (https://...)');
		if (!url) return;
		const text = window.prompt('Linktekst', url) ?? url;
		insertAtCursor(`[${text}](${url})`);
	};

	const handlePickImage = () => {
		fileInputRef.current?.click();
	};

	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		setUploading(true);
		await runAnnouncementImageUpload({
			file,
			isSchemaMissing,
			supabase,
			insertAtCursor,
		});
		setUploading(false);
	};

	const audience: AnnouncementAudience[] = audienceFromFormFlags(form);
	const isFormValid = isAnnouncementFormValid(form.title, audience);

	const handleSave = () =>
		runAnnouncementSave({
			isFormValid,
			isSchemaMissing,
			form,
			audience,
			editingId: editing?.id,
			editingPublishedAt: editing?.published_at,
			supabase,
			setSaving,
			setDialogOpen,
			refetch,
		});

	const handleDelete = async () => {
		if (!deleteTarget) return;
		const { error: deleteError } = await supabase.from('announcements').delete().eq('id', deleteTarget.id);
		if (deleteError) {
			toast.error('Verwijderen mislukt', { description: deleteError.message });
		} else {
			toast.success('Bericht verwijderd');
		}
		setDeleteTarget(null);
		await refetch();
	};

	const dialogActions = useFormCrudDialogActions(crud, {
		isFormValid,
		onSave: handleSave,
		onDelete: handleDelete,
		deleteTitle: 'Nieuwsbericht verwijderen',
		getDeleteDescription: (entity) => `Weet je zeker dat je "${entity.title}" wilt verwijderen?`,
	});

	return {
		announcements,
		isLoading,
		error,
		isSchemaMissing,
		dialogOpen,
		setDialogOpen,
		editing,
		form,
		setForm,
		deleteTarget,
		setDeleteTarget,
		openCreate,
		openEdit,
		uploading,
		bodyRef,
		fileInputRef,
		handleInsertLink,
		handlePickImage,
		handleImageUpload,
		audience,
		dialogActions,
	};
}
