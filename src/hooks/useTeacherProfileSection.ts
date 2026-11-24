import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { deleteProfileAvatar, takeAvatarFileFromInput, uploadProfileAvatar } from '@/lib/account/profileAvatarActions';
import {
	applyTeacherProfileSaveFeedback,
	runTeacherProfileSave,
	teacherProfileSaveFeedback,
} from '@/lib/teachers/teacherProfileSaveActionHelpers';
import {
	applyTeacherProfileInitials,
	createTeacherProfileFormState,
	hasTeacherProfileFormChanges,
	mapLoadedTeacherProfile,
	shouldFetchTeacherProfile,
	shouldStartProfileLoading,
	type TeacherProfileFormValues,
	type TeacherProfileInitials,
} from '@/lib/teachers/teacherProfileSectionHelpers';

export interface UseTeacherProfileSectionParams {
	teacherUserId: string;
	user_id: string;
	canEdit: boolean;
	onUpdate?: () => void;
	initialBio?: string | null;
	initialFirstName?: string | null;
	initialLastName?: string | null;
	initialEmail?: string | null;
	initialPhoneNumber?: string | null;
	initialAvatarUrl?: string | null;
	initialCocIssuedOn?: string | null;
}

async function loadTeacherProfileData(teacherUserId: string, userId: string) {
	const { data: teacherData, error: teacherError } = await supabase
		.from('teachers')
		.select('bio, coc_issued_on')
		.eq('user_id', teacherUserId)
		.single();

	if (teacherError) throw teacherError;

	const { data: profileData, error: profileError } = await supabase
		.from('profiles')
		.select('first_name, last_name, email, phone_number')
		.eq('user_id', userId)
		.single();

	if (profileError) throw profileError;

	return mapLoadedTeacherProfile(teacherData, profileData);
}

async function maybeUploadAvatar(canEdit: boolean, userId: string, event: ChangeEvent<HTMLInputElement>) {
	if (!canEdit) return null;
	const file = takeAvatarFileFromInput(event);
	if (!file) return null;
	return uploadProfileAvatar(userId, file);
}

async function maybeDeleteAvatar(canEdit: boolean, userId: string) {
	if (!canEdit) return false;
	return deleteProfileAvatar(userId);
}

export function useTeacherProfileSection({
	teacherUserId,
	user_id,
	canEdit,
	onUpdate,
	initialBio,
	initialFirstName,
	initialLastName,
	initialEmail,
	initialPhoneNumber,
	initialAvatarUrl,
	initialCocIssuedOn,
}: UseTeacherProfileSectionParams) {
	const { user } = useAuth();
	const profileInitials: TeacherProfileInitials = useMemo(
		() => ({
			initialBio,
			initialFirstName,
			initialLastName,
			initialEmail,
			initialPhoneNumber,
			initialCocIssuedOn,
		}),
		[initialBio, initialFirstName, initialLastName, initialEmail, initialPhoneNumber, initialCocIssuedOn],
	);

	const [form, setForm] = useState<TeacherProfileFormValues>(() => createTeacherProfileFormState(profileInitials));
	const [baseline, setBaseline] = useState<TeacherProfileFormValues>(() =>
		createTeacherProfileFormState(profileInitials),
	);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
	const [loading, setLoading] = useState(shouldStartProfileLoading(profileInitials));
	const [saving, setSaving] = useState(false);
	const [avatarSaving, setAvatarSaving] = useState(false);
	const [cocIssuedOnDraftSynced, setCocIssuedOnDraftSynced] = useState(true);

	useEffect(() => {
		setAvatarUrl(initialAvatarUrl ?? null);
	}, [initialAvatarUrl]);

	useEffect(() => {
		if (!shouldFetchTeacherProfile(profileInitials, teacherUserId, user_id)) return;

		setLoading(true);
		void loadTeacherProfileData(teacherUserId, user_id)
			.then((loaded) => {
				const next = {
					bio: loaded.bio,
					cocIssuedOn: loaded.cocIssuedOn,
					hasCoc: loaded.hasCoc,
					firstName: loaded.firstName,
					lastName: loaded.lastName,
					email: loaded.email,
					phoneNumber: loaded.phoneNumber,
				};
				setForm(next);
				setBaseline(next);
				setCocIssuedOnDraftSynced(true);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error loading profile:', error);
				toast.error('Fout bij laden profiel');
				setLoading(false);
			});
	}, [profileInitials, teacherUserId, user_id]);

	useEffect(() => {
		setForm((current) => applyTeacherProfileInitials(current, profileInitials));
		setBaseline((current) => applyTeacherProfileInitials(current, profileInitials));
		setCocIssuedOnDraftSynced(true);
	}, [profileInitials]);

	const runAction = async () => {
		setSaving(true);
		const result = await runTeacherProfileSave({
			supabase,
			teacherUserId,
			userId: user_id,
			canEdit,
			hasUser: !!user,
			form,
			cocIssuedOnDraftSynced,
		});
		setSaving(false);

		applyTeacherProfileSaveFeedback(teacherProfileSaveFeedback(result), {
			onValidation: (message) => toast.error(message),
			onError: (label, message) => {
				console.error(`Error updating ${label}:`, message);
				toast.error(`Fout bij bijwerken ${label}`, { description: message });
			},
			onSuccess: () => {
				toast.success('Profiel bijgewerkt');
				onUpdate?.();
			},
		});
	};

	const onUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
		setAvatarSaving(true);
		const result = await maybeUploadAvatar(canEdit, user_id, event);
		setAvatarSaving(false);
		if (!result?.ok) return;
		setAvatarUrl(result.avatarUrl);
		onUpdate?.();
	};

	const onDeleteAvatar = async () => {
		setAvatarSaving(true);
		const deleted = await maybeDeleteAvatar(canEdit, user_id);
		setAvatarSaving(false);
		if (!deleted) return;
		setAvatarUrl(null);
		onUpdate?.();
	};

	return {
		loading,
		form,
		setForm,
		avatarUrl,
		saving,
		avatarSaving,
		cocIssuedOnDraftSynced,
		setCocIssuedOnDraftSynced,
		hasChanges: hasTeacherProfileFormChanges(baseline, form),
		runAction,
		onUploadAvatar,
		onDeleteAvatar,
	};
}
