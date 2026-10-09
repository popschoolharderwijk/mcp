import type { ReactNode } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import { UserDisplay } from '@/components/ui/user-display';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { mapConfirmSelectedLessonTypeValues } from '@/lib/agreements/confirmStepSummaryRowsHelpers';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { DAY_NAMES } from '@/lib/date/day-index';
import { frequencyLabels } from '@/lib/frequencies';
import { formatTime } from '@/lib/time/time-format';
import type {
	LessonFrequency,
	WizardInitialAgreement,
	WizardLessonTypeInfo,
	WizardTeacherInfo,
} from '@/types/lesson-agreements';
import { ConfirmStepRow } from './ConfirmStepRow';
import { formatLessonPrice } from './confirmStepShared';

function ConfirmLessonTypeRow({
	lessonTypeName,
	frequency,
}: {
	lessonTypeName: string | null | undefined;
	frequency: LessonFrequency | null | undefined;
}) {
	const frequencyLabel = frequency ? frequencyLabels[frequency] : null;
	return (
		<ConfirmStepRow label="Lessoort" alwaysSame>
			<span>{lessonTypeName && frequencyLabel ? `${lessonTypeName} (${frequencyLabel})` : '-'}</span>
		</ConfirmStepRow>
	);
}

function ConfirmDurationRow({ minutes }: { minutes: number | null | undefined }) {
	return (
		<ConfirmStepRow label="Duur" alwaysSame>
			<span>{minutes != null ? `${minutes} min` : '-'}</span>
		</ConfirmStepRow>
	);
}

function ConfirmPriceRow({ price }: { price: number | null | undefined }) {
	return (
		<ConfirmStepRow label="Prijs" alwaysSame>
			<span>{formatLessonPrice(price)}</span>
		</ConfirmStepRow>
	);
}

export function ConfirmPeriodDisplayRow({ startDate, endDate }: { startDate: string; endDate: string }) {
	return (
		<ConfirmStepRow label="Periode">
			<p className="font-medium">
				{startDate ? formatDbDateToUi(startDate) : '-'} t/m {endDate ? formatDbDateToUi(endDate) : 'Geen'}
			</p>
		</ConfirmStepRow>
	);
}

export function ConfirmTeacherDisplayRow({
	teacher,
}: {
	teacher: WizardTeacherInfo | WizardInitialAgreement['teacher'] | null | undefined;
}) {
	const profile = teacherProfileFromWizard(teacher);
	return (
		<ConfirmStepRow label="Docent">
			{profile ? <UserDisplay profile={profile} showEmail /> : <p className="font-medium">-</p>}
		</ConfirmStepRow>
	);
}

export function ConfirmSlotDisplayRow({ slot }: { slot: SlotWithStatus | null }) {
	return (
		<ConfirmStepRow label="Tijdslot">
			<p className="font-medium">
				{slot ? `${DAY_NAMES[slot.day_of_week]} om ${formatTime(slot.start_time)}` : '-'}
			</p>
			{slot?.status === 'partial' && (
				<p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
					<LuTriangleAlert className="h-3 w-3" />
					Deels bezet ({slot.occupiedOccurrences}/{slot.totalOccurrences} momenten)
				</p>
			)}
		</ConfirmStepRow>
	);
}

export function ConfirmSlotDiffValue({ slot }: { slot: SlotWithStatus | null }) {
	if (!slot) return <span>-</span>;
	return (
		<>
			<span>
				{DAY_NAMES[slot.day_of_week]} om {formatTime(slot.start_time)}
			</span>
			{slot.status === 'partial' && (
				<p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
					<LuTriangleAlert className="h-3 w-3" />
					Deels bezet ({slot.occupiedOccurrences}/{slot.totalOccurrences} momenten)
				</p>
			)}
		</>
	);
}

export function ConfirmSelectedLessonTypeRows({ lessonType }: { lessonType: WizardLessonTypeInfo | undefined }) {
	const values = mapConfirmSelectedLessonTypeValues(lessonType);
	return (
		<>
			<ConfirmLessonTypeRow lessonTypeName={values.lessonTypeName} frequency={values.frequency} />
			<ConfirmDurationRow minutes={values.durationMinutes} />
			<ConfirmPriceRow price={values.pricePerLesson} />
		</>
	);
}

export function ConfirmInitialAgreementRows({ agreement }: { agreement: WizardInitialAgreement }) {
	const frequency = agreement.lesson_type?.frequency ?? agreement.frequency;
	return (
		<>
			<ConfirmLessonTypeRow lessonTypeName={agreement.lesson_type?.name} frequency={frequency} />
			<ConfirmDurationRow minutes={agreement.duration_minutes} />
			<ConfirmPriceRow price={agreement.price_per_lesson} />
		</>
	);
}

export function ConfirmTeacherDiffValue({
	teacher,
}: {
	teacher: WizardTeacherInfo | WizardInitialAgreement['teacher'] | null | undefined;
}) {
	const profile = teacherProfileFromWizard(teacher);
	if (!profile) return <span>-</span>;
	return <UserDisplay profile={profile} showEmail />;
}

function teacherProfileFromWizard(teacher: WizardTeacherInfo | WizardInitialAgreement['teacher'] | null | undefined) {
	if (!teacher) return null;
	if ('firstName' in teacher) {
		return {
			first_name: teacher.firstName,
			last_name: teacher.lastName,
			email: teacher.email,
			avatar_url: teacher.avatarUrl,
		};
	}
	return {
		first_name: teacher.first_name,
		last_name: teacher.last_name,
		email: teacher.email,
		avatar_url: teacher.avatar_url,
	};
}

export function ConfirmStepDiffRow({
	label,
	changed,
	oldValue,
	newValue,
	hideIcon,
	children,
}: {
	label: string;
	changed?: boolean;
	oldValue?: ReactNode;
	newValue?: ReactNode;
	hideIcon?: boolean;
	children?: ReactNode;
}) {
	return (
		<ConfirmStepRow label={label} hideIcon={hideIcon} changed={changed} oldValue={oldValue} newValue={newValue}>
			{children}
		</ConfirmStepRow>
	);
}
