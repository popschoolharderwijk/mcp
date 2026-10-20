import { LuTriangleAlert } from 'react-icons/lu';
import {
	formatIndicativeLessonRevenue,
	formatLessonGroupMemberCount,
	getLessonGroupMembersPlaceholder,
	toggleSelectedRequestId,
} from '@/components/lesson-groups/wizard/lessonGroupMembersStepHelpers';
import type { LessonGroupWizardState } from '@/components/lesson-groups/wizard/useLessonGroupWizard';
import { Label } from '@/components/ui/label';
import { UserSelectMultiple } from '@/components/ui/user-select';

interface LessonGroupMembersStepProps {
	wizard: LessonGroupWizardState;
}

export function LessonGroupMembersStep({ wizard }: LessonGroupMembersStepProps) {
	const { form, formUpdaters, eligibleStudentIds, pendingRequests } = wizard;
	const placeholder = getLessonGroupMembersPlaceholder(eligibleStudentIds.length);
	const memberCountLabel = formatLessonGroupMemberCount(form.memberIds.length);

	return (
		<div className="space-y-4 py-2">
			<div>
				<Label>Leerlingen</Label>
				<UserSelectMultiple
					value={form.memberIds}
					onChange={(users) => formUpdaters.setMemberIds(users.map((u) => u.user_id))}
					filter="students"
					includeUserIds={eligibleStudentIds}
					placeholder={placeholder}
				/>
				<p className="mt-2 text-xs text-muted-foreground">
					{memberCountLabel}
					
				</p>
				{form.memberIds.length === 0 ? (
					<p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
						<LuTriangleAlert className="h-3 w-3" />
						Je kunt later nog leerlingen toevoegen.
					</p>
				) : null}
			</div>
			{pendingRequests.length > 0 ? (
				<div>
					<Label>Aanmeldingen voor deze lessoort</Label>
					<p className="mb-2 text-xs text-muted-foreground">
						Selecteer aanmeldingen om bij opslaan een leerling-account aan te maken en direct in deze groep
						in te schrijven.
					</p>
					<div className="space-y-1 rounded-md border p-2">
						{pendingRequests.map((request) => (
							<label
								key={request.id}
								className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
							>
								<input
									type="checkbox"
									checked={form.selectedRequestIds.includes(request.id)}
									onChange={(event) =>
										formUpdaters.setSelectedRequestIds(
											toggleSelectedRequestId(
												form.selectedRequestIds,
												request.id,
												event.target.checked,
											),
										)
									}
									className="h-4 w-4 rounded border-input"
								/>
								<span className="font-medium">
									{request.first_name} {request.last_name}
								</span>
								<span className="text-muted-foreground text-xs">{request.email}</span>
							</label>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
