import { AccountProfileAvatarSection } from '@/components/account/AccountProfileAvatarSection';
import { TeacherProfileForm } from '@/components/teachers/TeacherProfileForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import { type UseTeacherProfileSectionParams, useTeacherProfileSection } from '@/hooks/useTeacherProfileSection';
import { getUserInitials } from '@/lib/user-initials';

export function TeacherProfileSection(props: UseTeacherProfileSectionParams) {
	const {
		loading,
		form,
		setForm,
		avatarUrl,
		saving,
		avatarSaving,
		cocIssuedOnDraftSynced,
		setCocIssuedOnDraftSynced,
		hasChanges,
		runAction,
		onUploadAvatar,
		onDeleteAvatar,
	} = useTeacherProfileSection(props);

	if (loading) {
		return <SectionSkeleton />;
	}

	const initials = getUserInitials({
		first_name: form.firstName,
		last_name: form.lastName,
		email: form.email,
	});

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Persoonlijke gegevens</CardTitle>
			</CardHeader>
			<CardContent>
				<TeacherProfileForm
					form={form}
					canEdit={props.canEdit}
					saving={saving}
					hasChanges={hasChanges}
					cocIssuedOnDraftSynced={cocIssuedOnDraftSynced}
					onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
					onCocIssuedOnDraftSyncedChange={setCocIssuedOnDraftSynced}
					onSave={() => void runAction()}
					avatar={
						props.canEdit ? (
							<AccountProfileAvatarSection
								profile={{ avatar_url: avatarUrl }}
								userInitials={initials}
								saving={saving || avatarSaving}
								onUploadAvatar={(e) => void onUploadAvatar(e)}
								onDeleteAvatar={() => void onDeleteAvatar()}
							/>
						) : undefined
					}
				/>
			</CardContent>
		</Card>
	);
}
