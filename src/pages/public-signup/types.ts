import type { FormEvent } from 'react';
import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import type { SignupFormFields, SignupSepaFields } from '@/lib/signup/publicSignupHelpers';
import type { LessonTypeOptionRow } from '@/types/lesson-agreements';

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
	frequency: string;
	price_per_lesson: number;
	teacher_name: string | null;
	members_count: number;
}

export type SignupStep = 1 | 2 | 3 | 4;

export const DAY_LABELS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

export interface PublicSignupFlowProps {
	step: SignupStep;
	selectedType: LessonType | null;
	lessonTypes: LessonType[];
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	lessonTypeOptions: LessonTypeOptionRow[];
	selectedOption: OptionSnapshot | null;
	form: SignupFormFields;
	sepa: SignupSepaFields;
	error: string | null;
	submitting: boolean;
	onSelectType: (lessonType: LessonType) => void;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
	onSelectOption: (option: OptionSnapshot | null) => void;
	onFormChange: (form: SignupFormFields) => void;
	onSepaChange: (sepa: SignupSepaFields) => void;
	onStepChange: (step: SignupStep) => void;
	onSubmit: (event: FormEvent) => void;
}
