import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TeacherProfileForm } from '@/components/teachers/TeacherProfileForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
	applyTeacherProfileSaveFeedback,
	runTeacherProfileSave,
	teacherProfileSaveFeedback,
} from '@/lib/teachers/teacherProfileSaveActionHelpers';
import {
	applyTeacherProfileInitials,
	createTeacherProfileFormState,
	mapLoadedTeacherProfile,
	shouldFetchTeacherProfile,
	shouldStartProfileLoading,
	type TeacherProfileFormValues,
	type TeacherProfileInitials,
} from '@/lib/teachers/teacherProfileSectionHelpers';

interface TeacherProfileSectionProps {
	teacherUserId: string;
	user_id: string;
	canEdit: boolean;
	onUpdate?: () => void;
	initialBio?: string | null;
	initialFirstName?: string | null;
	initialLastName?: string | null;
	initialEmail?: string | null;
	initialPhoneNumber?: string | null;
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

function applyLoadedProfile(setForm: (values: TeacherProfileFormValues) => void, loaded: TeacherProfileFormValues) {
	setForm({
		bio: loaded.bio,
		cocIssuedOn: loaded.cocIssuedOn,
		hasCoc: loaded.hasCoc,
		firstName: loaded.firstName,
		lastName: loaded.lastName,
		email: loaded.email,
		phoneNumber: loaded.phoneNumber,
	});
}

export function TeacherProfileSection({
	teacherUserId,
	user_id,
	canEdit,
	onUpdate,
	initialBio,
	initialFirstName,
	initialLastName,
	initialEmail,
	initialPhoneNumber,
	initialCocIssuedOn,
}: TeacherProfileSectionProps) {
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
	const [loading, setLoading] = useState(shouldStartProfileLoading(profileInitials));
	const [saving, setSaving] = useState(false);
	const [cocIssuedOnDraftSynced, setCocIssuedOnDraftSynced] = useState(true);

	useEffect(() => {
		if (!shouldFetchTeacherProfile(profileInitials, teacherUserId, user_id)) return;

		setLoading(true);
		void loadTeacherProfileData(teacherUserId, user_id)
			.then((loaded) => {
				applyLoadedProfile(setForm, loaded);
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

	if (loading) {
		return <SectionSkeleton />;
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Persoonlijke gegevens</CardTitle>
			</CardHeader>
			<CardContent>
				<TeacherProfileForm
					form={form}
					canEdit={canEdit}
					saving={saving}
					cocIssuedOnDraftSynced={cocIssuedOnDraftSynced}
					onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
					onCocIssuedOnDraftSyncedChange={setCocIssuedOnDraftSynced}
					onSave={() => void runAction()}
				/>
			</CardContent>
		</Card>
	);
}
