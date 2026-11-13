import { type FocusEvent, type FocusEventHandler, useState } from 'react';

type SafeInputFocusHandler = FocusEventHandler<HTMLInputElement>;

/** Vendor password-manager opt-outs; browsers ignore autocomplete="off" alone. */
const passwordManagerIgnoreInputProps = {
	autoComplete: 'off',
	'data-1p-ignore': true,
	'data-op-ignore': true,
	'data-lpignore': 'true',
	'data-bwignore': 'true',
	'data-protonpass-ignore': true,
	'data-form-type': 'other',
} as const;

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
