import { useEffect, useState } from 'react';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import type { FreeSlotForTeacher } from '@/lib/agreementSlots';
import type { TrialLessonsSetting } from '@/lib/settings/appSettingsTypes';
import { getScheduleTrialLessonResetValues, todayPlus } from '@/lib/trial-lessons/scheduleTrialLessonHelpers';

export interface ScheduleTrialLessonSignupRequestPrefill {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	lesson_type_id: string;
	lesson_type_option_id: string | null;
}

function resetFormFields(
	signupRequest: ScheduleTrialLessonSignupRequestPrefill | null | undefined,
	trial: TrialLessonsSetting,
	setters: {
		setStudentEmail: (value: string) => void;
		setStudentFirstName: (value: string) => void;
		setStudentLastName: (value: string) => void;
		setNotes: (value: string) => void;
		setSelected: (value: FreeSlotForTeacher | null) => void;
		setFromDate: (value: string) => void;
		setToDate: (value: string) => void;
		setDuration: (value: number) => void;
	},
) {
	const values = getScheduleTrialLessonResetValues(signupRequest, trial);
	setters.setStudentEmail(values.studentEmail);
	setters.setStudentFirstName(values.studentFirstName);
	setters.setStudentLastName(values.studentLastName);
	setters.setNotes(values.notes);
	setters.setSelected(null);
	setters.setFromDate(values.fromDate);
	setters.setToDate(values.toDate);
	setters.setDuration(values.duration);
}

export function useScheduleTrialLessonFormState(
	open: boolean,
	signupRequest: ScheduleTrialLessonSignupRequestPrefill | null | undefined,
) {
	const { settings } = useAppSettingsContext();
	const trial = settings.trial_lessons;
	const [fromDate, setFromDate] = useState(() => todayPlus(1));
	const [toDate, setToDate] = useState(() => todayPlus(trial.horizon_days));
	const [duration, setDuration] = useState(() => trial.default_duration_minutes);
	const [notes, setNotes] = useState('');
	const [studentEmail, setStudentEmail] = useState('');
	const [studentFirstName, setStudentFirstName] = useState('');
	const [studentLastName, setStudentLastName] = useState('');
	const [selected, setSelected] = useState<FreeSlotForTeacher | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!open) return;
		resetFormFields(signupRequest, trial, {
			setStudentEmail,
			setStudentFirstName,
			setStudentLastName,
			setNotes,
			setSelected,
			setFromDate,
			setToDate,
			setDuration,
		});
	}, [open, signupRequest, trial]);

	return {
		fromDate,
		toDate,
		duration,
		notes,
		studentEmail,
		studentFirstName,
		studentLastName,
		selected,
		submitting,
		setFromDate,
		setToDate,
		setDuration,
		setNotes,
		setStudentEmail,
		setStudentFirstName,
		setStudentLastName,
		setSelected,
		setSubmitting,
	};
}
