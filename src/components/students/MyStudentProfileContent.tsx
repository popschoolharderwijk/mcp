import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import { ParentContactCard } from '@/components/students/ParentContactCard';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { SignupRequestItem } from '@/components/students/SignupRequestItem';
import { StudentAgreementsCard, StudentSignupRequestsCard } from '@/components/students/StudentProfileCards';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { getUserInitials } from '@/components/ui/user-display';
import { NAV_LABELS } from '@/config/nav-labels';
import { getDisplayName } from '@/lib/display-name';
import { hasParentContactInfo } from '@/lib/students/myStudentProfileHelpers';
import type { MyStudentProfileData } from '@/lib/students/myStudentProfileLoadHelpers';

interface MyStudentProfileContentProps {
	profile: MyStudentProfileData;
	agreements: LessonAgreement[];
	signupRequests: SignupRequestDetail[];
}

export function MyStudentProfileContent({ profile, agreements, signupRequests }: MyStudentProfileContentProps) {
	const displayName = getDisplayName(profile.profile);
	const initials = getUserInitials(profile.profile);

	return (
		<PageShell title={NAV_LABELS.myProfile} description="Bekijk je profielgegevens en lesovereenkomsten">
			<div className="space-y-6">
				<div className="grid gap-6 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Persoonlijke gegevens</CardTitle>
							<CardDescription>Je basisgegevens</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-4">
								<Avatar className="h-16 w-16">
									<AvatarImage src={profile.profile.avatar_url ?? undefined} alt={displayName} />
									<AvatarFallback className="bg-primary/10 text-primary text-lg">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-semibold text-lg">{displayName}</p>
									<p className="text-sm text-muted-foreground">{profile.profile.email}</p>
								</div>
							</div>
							<div className="space-y-2">
								<div>
									<p className="text-sm font-medium text-muted-foreground">Telefoonnummer</p>
									<p className="text-sm">{profile.profile.phone_number || '-'}</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{hasParentContactInfo(profile.student) && <ParentContactCard student={profile.student} />}
				</div>

				<StudentAgreementsCard
					agreements={agreements}
					description="Overzicht van je lesovereenkomsten"
					emptyMessage="Geen lesovereenkomsten gevonden"
				/>

				<StudentSignupRequestsCard
					requests={signupRequests}
					description="Jouw aanmeldingen voor lessen"
					emptyMessage="Geen aanmeldingen gevonden"
					renderItem={(request) => <SignupRequestItem request={request} />}
				/>
			</div>
		</PageShell>
	);
}
