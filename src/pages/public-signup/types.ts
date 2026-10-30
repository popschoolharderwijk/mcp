import type { FormEvent } from 'react';
import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import type { SignupFormFields } from '@/lib/signup/publicSignupHelpers';
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
	onSelectType: (lessonType: LessonType) => void;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
	onSelectOption: (option: OptionSnapshot | null) => void;
	onFormChange: (form: SignupFormFields) => void;
	onStepChange: (step: number) => void;
	onSubmit: (event: FormEvent) => void;
}
