import type { FormEvent } from 'react';
import { LessonTypeOptionSelect, type OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import { Button } from '@/components/ui/button';
import { DateOfBirthField } from '@/components/ui/date-of-birth-field';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { frequencyLabels } from '@/lib/frequencies';
import {
	buildSignupOverviewRows,
	needsManualSignupChoiceNext,
	resolveSelectedSignupGroup,
	type SignupFormFields,
} from '@/lib/signup/publicSignupHelpers';
import type { LessonFrequency, LessonTypeOptionRow } from '@/types/lesson-agreements';
import { resolvePublicSignupRenderStep } from './publicSignupStepSwitchHelpers';
import { SignupFormField } from './SignupFormField';
import { DAY_LABELS, type GroupOption, type LessonType, type PublicSignupFlowProps } from './types';

function SignupStepNav(props: {
	onPrevious: () => void;
	justifyBetween: boolean;
	next?: {
		label: string;
		disabled?: boolean;
		type?: 'button' | 'submit';
		onClick?: () => void;
	};
}) {
	return (
		<div className={`flex pt-4 ${props.justifyBetween ? 'justify-between' : 'justify-start'}`}>
			<Button type="button" variant="outline" onClick={props.onPrevious}>
				Vorige
			</Button>
			{props.next ? (
				<Button type={props.next.type ?? 'button'} disabled={props.next.disabled} onClick={props.next.onClick}>
					{props.next.label}
				</Button>
			) : null}
		</div>
	);
}

function LessonTypeStep(props: {
	lessonTypes: LessonType[];
	selectedType: LessonType | null;
	onSelectType: (lessonType: LessonType) => void;
}) {
	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold">Welke les wil je volgen?</h2>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{props.lessonTypes.map((lessonType) => (
					<button
						type="button"
						key={lessonType.id}
						onClick={() => props.onSelectType(lessonType)}
						className={`rounded-lg border-2 p-4 text-left transition ${
							props.selectedType?.id === lessonType.id
								? 'border-primary bg-primary/5'
								: 'border-border hover:border-primary/50'
						}`}
					>
						<div className="font-medium">{lessonType.name}</div>
						{lessonType.is_group_lesson ? (
							<div className="mt-1 text-xs text-muted-foreground">Groepsles</div>
						) : null}
					</button>
				))}
			</div>
		</div>
	);
}

function GroupLessonSelection(props: {
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
}) {
	return (
		<div className="space-y-2">
			{props.groups.length === 0 ? (
				<p className="text-sm text-muted-foreground">Geen actieve groepen beschikbaar.</p>
			) : null}
			{props.groups.map((group) => (
				<button
					type="button"
					key={group.id}
					onClick={() => props.onSelectGroupId(group.id)}
					className={`w-full rounded-lg border-2 p-4 text-left transition ${
						props.selectedGroupId === group.id
							? 'border-primary bg-primary/5'
							: 'border-border hover:border-primary/50'
					}`}
				>
					<div className="font-medium">{group.name}</div>
					<div className="mt-1 text-sm text-muted-foreground">
						{DAY_LABELS[group.day_of_week]} {group.start_time.slice(0, 5)} · {group.duration_minutes} min ·{' '}
						{frequencyLabels[group.frequency as LessonFrequency] ?? group.frequency}
					</div>
					<div className="text-sm text-muted-foreground">
						{group.teacher_name ? `Docent: ${group.teacher_name}` : ''} · {group.members_count} deelnemers ·
						€{Number(group.price_per_lesson).toFixed(2)} per les
					</div>
				</button>
			))}
			<button
				type="button"
				onClick={() => props.onSelectGroupId('waitlist')}
				className={`w-full rounded-lg border-2 border-dashed p-4 text-left transition ${
					props.selectedGroupId === 'waitlist'
						? 'border-primary bg-primary/5'
						: 'border-border hover:border-primary/50'
				}`}
			>
				<div className="font-medium">Zet me op de wachtlijst</div>
				<div className="text-sm text-muted-foreground">We nemen contact op zodra een plek beschikbaar is.</div>
			</button>
		</div>
	);
}

function IndividualLessonSelection(props: {
	lessonTypeName: string;
	lessonTypeOptions: LessonTypeOptionRow[];
	selectedOption: OptionSnapshot | null;
	onSelectOption: (option: OptionSnapshot | null) => void;
}) {
	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Je meldt je aan voor individuele {props.lessonTypeName}-les. Kies hieronder hoe vaak en hoe lang je per
				les wilt komen. De prijs per les wordt direct getoond.
			</p>
			{props.lessonTypeOptions.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Er zijn nog geen opties ingesteld voor deze les. Vul je gegevens in op de volgende stap; we nemen
					contact op om de details af te stemmen.
				</p>
			) : (
				<div className="space-y-2">
					<Label>Duur, frequentie en prijs</Label>
					<LessonTypeOptionSelect
						options={props.lessonTypeOptions}
						value={props.selectedOption}
						onChange={props.onSelectOption}
					/>
				</div>
			)}
		</div>
	);
}

function ChoiceStep(props: {
	selectedType: LessonType;
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	lessonTypeOptions: LessonTypeOptionRow[];
	selectedOption: OptionSnapshot | null;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
	onSelectOption: (option: OptionSnapshot | null) => void;
	onPrevious: () => void;
	onNext: () => void;
}) {
	const needsManualNext = needsManualSignupChoiceNext(
		props.selectedType.is_group_lesson,
		props.lessonTypeOptions.length,
	);

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold">
				{props.selectedType.is_group_lesson ? 'Kies een groep' : 'Kies hoe vaak en hoe lang'}
			</h2>
			{props.selectedType.is_group_lesson ? (
				<GroupLessonSelection
					groups={props.groups}
					selectedGroupId={props.selectedGroupId}
					onSelectGroupId={(groupId) => {
						props.onSelectGroupId(groupId);
						props.onNext();
					}}
				/>
			) : (
				<IndividualLessonSelection
					lessonTypeName={props.selectedType.name}
					lessonTypeOptions={props.lessonTypeOptions}
					selectedOption={props.selectedOption}
					onSelectOption={(option) => {
						props.onSelectOption(option);
						if (option) props.onNext();
					}}
				/>
			)}
			<SignupStepNav
				onPrevious={props.onPrevious}
				justifyBetween={needsManualNext}
				next={needsManualNext ? { label: 'Volgende', onClick: props.onNext } : undefined}
			/>
		</div>
	);
}

function DetailsStep(props: {
	form: SignupFormFields;
	onFormChange: (form: SignupFormFields) => void;
	onPrevious: () => void;
	onNext: () => void;
}) {
	const handleContinue = (event: FormEvent) => {
		event.preventDefault();
		props.onNext();
	};

	return (
		<form className="space-y-4" onSubmit={handleContinue}>
			<h2 className="text-lg font-semibold">Jouw gegevens</h2>
			<div className="grid grid-cols-2 gap-3">
				<SignupFormField
					id="signup-first-name"
					label="Voornaam *"
					value={props.form.first_name}
					onChange={(first_name) => props.onFormChange({ ...props.form, first_name })}
					placeholder="Jan"
					autoComplete="given-name"
					required
				/>
				<SignupFormField
					id="signup-last-name"
					label="Achternaam *"
					value={props.form.last_name}
					onChange={(last_name) => props.onFormChange({ ...props.form, last_name })}
					placeholder="Jansen"
					autoComplete="family-name"
					required
				/>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<SignupFormField
					id="signup-email"
					label="E-mail *"
					type="email"
					value={props.form.email}
					onChange={(email) => props.onFormChange({ ...props.form, email })}
					placeholder="leerling@voorbeeld.nl"
					autoComplete="email"
					required
				/>
				<div className="grid grid-cols-2 gap-3">
					<PhoneInput
						id="signup-phone"
						label="Telefoonnummer"
						value={props.form.phone_number}
						onChange={(phone_number) => props.onFormChange({ ...props.form, phone_number })}
						autoComplete="tel-national"
					/>
					<DateOfBirthField
						id="signup-dob"
						value={props.form.date_of_birth || null}
						onChange={(date_of_birth) =>
							props.onFormChange({ ...props.form, date_of_birth: date_of_birth ?? '' })
						}
					/>
				</div>
			</div>
			<div className="space-y-3 border-t pt-4">
				<p className="text-sm font-medium">Ouder/verzorger (indien minderjarig)</p>
				<SignupFormField
					id="signup-parent-name"
					label="Naam ouder"
					value={props.form.parent_name}
					onChange={(parent_name) => props.onFormChange({ ...props.form, parent_name })}
					placeholder="Jan Jansen"
					autoComplete="name"
				/>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<SignupFormField
						id="signup-parent-email"
						label="E-mail ouder"
						type="email"
						value={props.form.parent_email}
						onChange={(parent_email) => props.onFormChange({ ...props.form, parent_email })}
						placeholder="ouder@voorbeeld.nl"
						autoComplete="email"
					/>
					<PhoneInput
						id="signup-parent-phone"
						label="Telefoon ouder"
						value={props.form.parent_phone_number}
						onChange={(parent_phone_number) => props.onFormChange({ ...props.form, parent_phone_number })}
						autoComplete="tel-national"
					/>
				</div>
			</div>
			<div>
				<Label htmlFor="notes">Opmerkingen</Label>
				<textarea
					id="notes"
					className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
					rows={3}
					value={props.form.notes}
					onChange={(event) => props.onFormChange({ ...props.form, notes: event.target.value })}
				/>
			</div>
			<SignupStepNav onPrevious={props.onPrevious} justifyBetween next={{ label: 'Volgende', type: 'submit' }} />
		</form>
	);
}

function OverviewStep(props: {
	selectedType: LessonType;
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	selectedOption: OptionSnapshot | null;
	form: SignupFormFields;
	error: string | null;
	submitting: boolean;
	onPrevious: () => void;
	onSubmit: (event: FormEvent) => void;
}) {
	const rows = buildSignupOverviewRows({
		lessonTypeName: props.selectedType.name,
		isGroupLesson: props.selectedType.is_group_lesson,
		isWaitlist: props.selectedGroupId === 'waitlist',
		group: resolveSelectedSignupGroup(props.groups, props.selectedGroupId),
		option: props.selectedOption,
		form: props.form,
	});

	return (
		<form className="space-y-4" onSubmit={props.onSubmit}>
			<h2 className="text-lg font-semibold">Controleer je aanmelding</h2>
			<p className="text-sm text-muted-foreground">Klopt alles? Dan versturen we je aanmelding.</p>
			{props.error ? (
				<div className="rounded border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{props.error}
				</div>
			) : null}
			<dl className="divide-y rounded-md border">
				{rows.map((row) => (
					<div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
						<dt className="text-sm font-medium text-muted-foreground">{row.label}</dt>
						<dd className="text-sm">{row.value}</dd>
					</div>
				))}
			</dl>
			<SignupStepNav
				onPrevious={props.onPrevious}
				justifyBetween
				next={{
					label: props.submitting ? 'Versturen...' : 'Aanmelden',
					type: 'submit',
					disabled: props.submitting,
				}}
			/>
		</form>
	);
}

export function PublicSignupSteps(props: PublicSignupFlowProps) {
	const renderStep = resolvePublicSignupRenderStep(props.step, props.selectedType !== null);
	if (renderStep === 1) {
		return (
			<LessonTypeStep
				lessonTypes={props.lessonTypes}
				selectedType={props.selectedType}
				onSelectType={props.onSelectType}
			/>
		);
	}
	if (renderStep === 2 && props.selectedType) {
		return (
			<ChoiceStep
				selectedType={props.selectedType}
				groups={props.groups}
				selectedGroupId={props.selectedGroupId}
				lessonTypeOptions={props.lessonTypeOptions}
				selectedOption={props.selectedOption}
				onSelectGroupId={props.onSelectGroupId}
				onSelectOption={props.onSelectOption}
				onPrevious={() => props.onStepChange(1)}
				onNext={() => props.onStepChange(3)}
			/>
		);
	}
	if (renderStep === 3) {
		return (
			<DetailsStep
				form={props.form}
				onFormChange={props.onFormChange}
				onPrevious={() => props.onStepChange(2)}
				onNext={() => props.onStepChange(4)}
			/>
		);
	}
	if (renderStep === 4 && props.selectedType) {
		return (
			<OverviewStep
				selectedType={props.selectedType}
				groups={props.groups}
				selectedGroupId={props.selectedGroupId}
				selectedOption={props.selectedOption}
				form={props.form}
				error={props.error}
				submitting={props.submitting}
				onPrevious={() => props.onStepChange(3)}
				onSubmit={props.onSubmit}
			/>
		);
	}
	return null;
}
