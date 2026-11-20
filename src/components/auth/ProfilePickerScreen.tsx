import { LuLoaderCircle } from 'react-icons/lu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { type MembershipProfileDisplay, membershipProfileInitials } from '@/lib/auth/profilePickerHelpers';

interface ProfilePickerScreenProps {
	profiles: MembershipProfileDisplay[];
	isSelecting: boolean;
	onSelect: (profileId: string) => void;
	onSignOut: () => void;
}

export function ProfilePickerScreen({ profiles, isSelecting, onSelect, onSignOut }: ProfilePickerScreenProps) {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
			<div className="w-full max-w-3xl space-y-10 text-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight">Kies een profiel</h1>
				</div>

				<div className="flex flex-wrap items-start justify-center gap-8">
					{profiles.map((profile) => (
						<Button
							key={profile.profileId}
							type="button"
							variant="ghost"
							disabled={isSelecting}
							onClick={() => onSelect(profile.profileId)}
							className="h-auto flex-col gap-3 px-4 py-3 hover:bg-accent/40"
						>
							<Avatar className="h-24 w-24 border-2 border-transparent hover:border-primary">
								<AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
								<AvatarFallback className="bg-primary text-primary-foreground text-2xl">
									{membershipProfileInitials(profile.displayName)}
								</AvatarFallback>
							</Avatar>
							<span className="text-base font-medium">{profile.displayName}</span>
						</Button>
					))}
				</div>

				{isSelecting ? (
					<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
						<LuLoaderCircle className="h-4 w-4 animate-spin" />
						Profiel laden…
					</p>
				) : (
					<Button type="button" variant="ghost" className="text-muted-foreground" onClick={onSignOut}>
						Uitloggen
					</Button>
				)}
			</div>
		</div>
	);
}
