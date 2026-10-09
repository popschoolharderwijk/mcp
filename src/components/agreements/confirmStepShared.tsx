import { UserDisplay } from '@/components/ui/user-display';
import type { UserOptional } from '@/types/users';
import { ConfirmStepRow } from './ConfirmStepRow';

export {
	formatLessonPrice,
	formatWizardPeriodRange,
	isWizardPeriodChanged,
	isWizardSlotChanged,
	isWizardTeacherChanged,
} from './confirmStepHelpers';

export function ConfirmStudentRow({ selectedUser }: { selectedUser: UserOptional | null }) {
	return (
		<ConfirmStepRow label="Leerling" alwaysSame>
			{selectedUser ? (
				<UserDisplay
					profile={{
						first_name: selectedUser.first_name,
						last_name: selectedUser.last_name,
						email: selectedUser.email,
						avatar_url: selectedUser.avatar_url,
					}}
					showEmail
				/>
			) : (
				<span>-</span>
			)}
		</ConfirmStepRow>
	);
}
