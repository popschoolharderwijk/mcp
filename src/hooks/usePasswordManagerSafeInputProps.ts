import { type FocusEvent, type FocusEventHandler, useState } from 'react';
import { passwordManagerIgnoreInputProps } from '@/components/ui/input';

type SafeInputFocusHandler = FocusEventHandler<HTMLInputElement>;

/**
 * Props for non-credential inputs (search, filters): vendor ignore attrs + read-only until focus.
 * Pass through an existing onFocus to keep caller handlers.
 */
export function usePasswordManagerSafeInputProps(onFocus?: SafeInputFocusHandler) {
	const [blocked, setBlocked] = useState(true);

	return {
		...passwordManagerIgnoreInputProps,
		readOnly: blocked,
		onFocus: (event: FocusEvent<HTMLInputElement>) => {
			event.currentTarget.removeAttribute('readonly');
			setBlocked(false);
			onFocus?.(event);
		},
	};
}
