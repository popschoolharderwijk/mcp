/**
 * Computes a live yearly/monthly amount preview for a lesson agreement, based on:
 *   - the matching `lesson_type_options` (for age tariffs),
 *   - the student's date of birth (to choose youth vs adult),
 *   - all `no_lesson_periods` in the school year.
 *
 * The school year is today's (or start_date when that is in the future),
 * clamped by agreement.start_date / end_date.
 */

import { useEffect, useState } from 'react';
import type {
	AgreementBillingPreview,
	AgreementBillingPreviewInput,
} from '@/lib/billing/agreementBillingPreviewHelpers';
import { loadAgreementBillingPreview } from '@/lib/billing/loadAgreementBillingPreview';

export type { AgreementBillingPreview };

interface AgreementInput extends AgreementBillingPreviewInput {
	id: string;
}

interface UseAgreementBillingPreviewResult {
	preview: AgreementBillingPreview | null;
	loading: boolean;
	error: string | null;
}

export function useAgreementBillingPreview(
	agreement: AgreementInput | null | undefined,
): UseAgreementBillingPreviewResult {
	const [preview, setPreview] = useState<AgreementBillingPreview | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		if (!agreement) {
			setPreview(null);
			setError(null);
			return;
		}

		async function load(input: AgreementInput) {
			setLoading(true);
			setError(null);

			const today = new Date().toISOString().slice(0, 10);
			const result = await loadAgreementBillingPreview(input, today);

			if (cancelled) return;

			setPreview(result.preview);
			setError(result.error);
			setLoading(false);
		}

		void load(agreement);
		return () => {
			cancelled = true;
		};
	}, [agreement]);

	return { preview, loading, error };
}
