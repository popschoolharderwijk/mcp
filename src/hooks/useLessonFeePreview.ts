import { useEffect, useState } from 'react';
import type { LessonFeePreview, LessonFeePreviewResult } from '@/lib/billing/loadLessonFeePreview';

export type { LessonFeePreview };

interface UseLessonFeePreviewResult {
	preview: LessonFeePreview | null;
	loading: boolean;
	error: string | null;
}

/**
 * Runs a fee preview loader whenever `key` changes. Pass `null` as key to skip.
 * The loader is called with no arguments; build it from stable inputs.
 */
export function useLessonFeePreview(
	key: string | null,
	loader: () => Promise<LessonFeePreviewResult>,
): UseLessonFeePreviewResult {
	const [preview, setPreview] = useState<LessonFeePreview | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: key encodes all loader inputs
	useEffect(() => {
		let cancelled = false;
		if (!key) {
			setPreview(null);
			setError(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		void loader().then((result) => {
			if (cancelled) return;
			setPreview(result.preview);
			setError(result.error);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [key]);

	return { preview, loading, error };
}
