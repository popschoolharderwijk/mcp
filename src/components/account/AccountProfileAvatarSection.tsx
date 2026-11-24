import { type ChangeEvent, useId } from 'react';
import { LuTrash2, LuUpload } from 'react-icons/lu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AVATAR_UPLOAD_ACCEPT } from '@/lib/account/accountProfileAvatarHelpers';
import type { AccountProfileState } from '@/lib/account/persistence';
import { cn } from '@/lib/utils';

interface AccountProfileAvatarSectionProps {
	profile: Pick<AccountProfileState, 'avatar_url'> | null;
	userInitials: string;
	saving: boolean;
	onUploadAvatar: (e: ChangeEvent<HTMLInputElement>) => void;
	onDeleteAvatar: () => void;
}

function AvatarUploadControl({
	uploadInputId,
	avatarSrc,
	userInitials,
	saving,
	onUploadAvatar,
}: {
	uploadInputId: string;
	avatarSrc: string | undefined;
	userInitials: string;
	saving: boolean;
	onUploadAvatar: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
	return (
		<label
			htmlFor={uploadInputId}
			className={cn(
				'group relative block h-20 w-20 cursor-pointer overflow-hidden rounded-full',
				'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
				saving && 'pointer-events-none opacity-50',
			)}
		>
			<input
				id={uploadInputId}
				type="file"
				accept={AVATAR_UPLOAD_ACCEPT}
				onChange={onUploadAvatar}
				disabled={saving}
				className="sr-only"
			/>
			<Avatar className="h-20 w-20">
				<AvatarImage src={avatarSrc} alt="" />
				<AvatarFallback className="bg-primary text-primary-foreground text-lg">{userInitials}</AvatarFallback>
			</Avatar>
			<span
				className={cn(
					'pointer-events-none absolute inset-0 flex items-center justify-center rounded-full',
					'bg-black/50 text-white opacity-0 transition-opacity',
					'group-hover:opacity-100 group-focus-within:opacity-100',
					'[@media(hover:none)]:opacity-100',
				)}
				aria-hidden="true"
			>
				<LuUpload className="h-6 w-6" aria-hidden="true" />
			</span>
			<span className="sr-only">Profielfoto uploaden</span>
		</label>
	);
}

function AvatarDeleteButton({
	visible,
	saving,
	onDeleteAvatar,
}: {
	visible: boolean;
	saving: boolean;
	onDeleteAvatar: () => void;
}) {
	if (!visible) return null;

	return (
		<button
			type="button"
			onClick={onDeleteAvatar}
			disabled={saving}
			aria-label="Profielfoto verwijderen"
			className={cn(
				'absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full',
				'border border-border bg-background text-destructive shadow-sm',
				'hover:bg-destructive hover:text-destructive-foreground',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				'disabled:pointer-events-none disabled:opacity-50',
			)}
		>
			<LuTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
		</button>
	);
}

export function AccountProfileAvatarSection({
	profile,
	userInitials,
	saving,
	onUploadAvatar,
	onDeleteAvatar,
}: AccountProfileAvatarSectionProps) {
	const uploadInputId = useId();
	const avatarUrl = profile?.avatar_url ?? null;

	return (
		<div className="relative shrink-0 pt-5">
			<AvatarUploadControl
				uploadInputId={uploadInputId}
				avatarSrc={avatarUrl ?? undefined}
				userInitials={userInitials}
				saving={saving}
				onUploadAvatar={onUploadAvatar}
			/>
			<AvatarDeleteButton visible={avatarUrl != null} saving={saving} onDeleteAvatar={onDeleteAvatar} />
		</div>
	);
}
