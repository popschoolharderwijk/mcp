import type { FormEvent, MutableRefObject } from 'react';
import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import type { TurnstileWidgetHandle } from '@/components/ui/turnstile-widget';
import type { SignupFormFields } from '@/lib/signup/publicSignupHelpers';
import type { LessonFrequency, LessonTypeOptionRow } from '@/types/lesson-agreements';

export interface LessonType {
	id: string;
	name: string;
	icon: string;
	color: string;
	is_group_lesson: boolean;
}

export interface GroupOption {
	id: string;
	name: string;
	day_of_week: number;
	start_time: string;
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
	teacher_name: string | null;
	members_count: number;
}

export const DAY_LABELS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

export interface PublicSignupFlowProps {
	/** 1-based step index; same scale as `Stepper`. */
	step: number;
	highestReachedStep: number;
	selectedType: LessonType | null;
	lessonTypes: LessonType[];
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	lessonTypeOptions: LessonTypeOptionRow[];
	selectedOption: OptionSnapshot | null;
	form: SignupFormFields;
	error: string | null;
	submitting: boolean;
	captchaToken: string | null;
	turnstileRef: MutableRefObject<TurnstileWidgetHandle | null>;
	onCaptchaToken: (token: string | null) => void;
	onSelectType: (lessonType: LessonType) => void;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
	onSelectOption: (option: OptionSnapshot | null) => void;
	onFormChange: (form: SignupFormFields) => void;
	onStepChange: (step: number) => void;
	onSubmit: (event: FormEvent) => void;
}
