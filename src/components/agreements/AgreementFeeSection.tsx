import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { LuCalendarX } from 'react-icons/lu';
import { toast } from 'sonner';
import type { WizardFormState } from '@/components/agreements/wizard/wizardFormTypes';
import { LessonAgreementPreviewBlock } from '@/components/students/LessonAgreementPreviewBlock';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { useAuth } from '@/hooks/useAuth';
import { useLessonFeePreview } from '@/hooks/useLessonFeePreview';
import { supabase } from '@/integrations/supabase/client';
import {
	buildAgreementTermNote,
	resolveDateOfBirthRequirement,
	resolveWizardFeePreviewKey,
} from '@/lib/agreements/agreementFeeSectionHelpers';
import { resolveEffectiveDateOfBirth } from '@/lib/agreements/wizardSaveHelpers';
import { loadLessonFeePreview } from '@/lib/billing/loadLessonFeePreview';
import { formatDateNl } from '@/lib/billing/lessonFeeFormat';
import type { AgreementTableRow } from '@/types/lesson-agreements';

interface Props {
	form: WizardFormState;
	setForm: Dispatch<SetStateAction<WizardFormState>>;
	isDuo: boolean;
	agreement: AgreementTableRow | null;
}

async function fetchDateOfBirth(userId: string | null): Promise<string | null> {
	if (!userId) return null;
	const { data } = await supabase.from('students').select('date_of_birth').eq('user_id', userId).maybeSingle();
	return data?.date_of_birth ?? null;
}

function useStoredDatesOfBirth(form: WizardFormState, setForm: Props['setForm']) {
	const { studentUserId, partnerStudentUserId } = form;
	useEffect(() => {
		let active = true;
		void Promise.all([fetchDateOfBirth(studentUserId), fetchDateOfBirth(partnerStudentUserId)]).then(
			([student, partner]) => {
				if (!active) return;
				setForm((f) => ({ ...f, studentDateOfBirth: student, partnerDateOfBirth: partner }));
			},
		);
		return () => {
			active = false;
		};
	}, [studentUserId, partnerStudentUserId, setForm]);
}

function DateOfBirthField({
	label,
	value,
	onChange,
	requirement,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	requirement: 'required' | 'warning';
}) {
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			<DatePicker value={value || null} onChange={(v) => onChange(v ?? '')} maxDate={new Date()} />
			<p className={requirement === 'required' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
				{requirement === 'required'
					? 'Verplicht bij SEPA-incasso en Stripe: zonder geboortedatum kunnen we het tarief (onder 21 of 21+) en de btw niet bepalen.'
					: 'Geen geboortedatum bekend. Bij handmatige facturatie mag dat, maar het lesgeld kan dan niet worden berekend.'}
			</p>
		</div>
	);
}

function CancelAgreementButton({ agreement }: { agreement: AgreementTableRow }) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [cancelledPer, setCancelledPer] = useState<string | null>(agreement.cancellation_effective_date ?? null);

	if (cancelledPer) {
		return <p className="text-sm text-muted-foreground">Opgezegd per {formatDateNl(cancelledPer)}.</p>;
	}

	const confirm = async () => {
		setLoading(true);
		const { data, error } = await supabase.rpc('cancel_lesson_agreement', { p_agreement_id: agreement.id });
		setLoading(false);
		if (error) {
			toast.error('Opzeggen is niet gelukt', { description: error.message });
			return;
		}
		setCancelledPer(data);
		setOpen(false);
		toast.success(`Overeenkomst opgezegd per ${formatDateNl(data)}`);
	};

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				<LuCalendarX className="mr-2 h-4 w-4" />
				Opzeggen
			</Button>
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Overeenkomst opzeggen?</AlertDialogTitle>
						<AlertDialogDescription>
							De overeenkomst stopt per het einde van de lopende periode (eerst de minimale looptijd, daarna 31
							juli), rekening houdend met de opzegtermijn uit de boekhoudinstellingen. Tot die datum blijft
							het lesgeld verschuldigd.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button variant="outline" disabled={loading}>
								Annuleren
							</Button>
						</AlertDialogCancel>
						<SubmitButton variant="destructive" loading={loading} loadingLabel="Opzeggen..." onClick={confirm}>
							Opzeggen
						</SubmitButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

/** Fee preview, date-of-birth inputs, term and cancellation on the wizard's confirm step. */
export function AgreementFeeSection({ form, setForm, isDuo, agreement }: Props) {
	const { isPrivileged } = useAuth();
	useStoredDatesOfBirth(form, setForm);

	const studentDob = resolveEffectiveDateOfBirth(form.studentDateOfBirth, form.studentDateOfBirthInput);
	const studentRequirement = resolveDateOfBirthRequirement(form.paymentMethod, isDuo, Boolean(form.studentDateOfBirth));
	const partnerRequirement = isDuo ? resolveDateOfBirthRequirement(form.paymentMethod, true, Boolean(form.partnerDateOfBirth)) : 'none';

	const optionId = form.selectedOptionSnapshot?.id ?? agreement?.lesson_type_option_id ?? null;
	const previewKey = resolveWizardFeePreviewKey({
		optionId,
		dateOfBirth: studentDob,
		startDate: form.startDate,
		endDate: form.endDate,
	});
	const { preview, loading, error } = useLessonFeePreview(previewKey, () =>
		loadLessonFeePreview({
			lesson_type_option_id: optionId ?? '',
			date_of_birth: studentDob,
			start_date: form.startDate,
			end_date: form.endDate || null,
		}),
	);

	return (
		<div className="space-y-4">
			{studentRequirement !== 'none' && (
				<DateOfBirthField
					label="Geboortedatum leerling"
					value={form.studentDateOfBirthInput}
					onChange={(v) => setForm((f) => ({ ...f, studentDateOfBirthInput: v }))}
					requirement={studentRequirement}
				/>
			)}
			{partnerRequirement !== 'none' && (
				<DateOfBirthField
					label="Geboortedatum duo-partner"
					value={form.partnerDateOfBirthInput}
					onChange={(v) => setForm((f) => ({ ...f, partnerDateOfBirthInput: v }))}
					requirement={partnerRequirement}
				/>
			)}
			<LessonAgreementPreviewBlock
				loading={loading}
				error={error}
				preview={preview}
				title={isDuo ? 'Lesgeld per persoon' : 'Lesgeld'}
				termNote={buildAgreementTermNote({
					minimumTermEnd: agreement?.minimum_term_end,
					cancellationEffectiveDate: agreement?.cancellation_effective_date,
				})}
			/>
			{agreement && isPrivileged && <CancelAgreementButton agreement={agreement} />}
		</div>
	);
}
