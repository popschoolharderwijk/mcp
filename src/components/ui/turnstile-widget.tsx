import { type MutableRefObject, useEffect, useRef } from 'react';

declare global {
	interface Window {
		turnstile?: {
			render: (
				element: HTMLElement,
				options: {
					sitekey: string;
					callback: (token: string) => void;
					'expired-callback'?: () => void;
					'error-callback'?: () => void;
				},
			) => string;
			reset: (widgetId?: string) => void;
			remove: (widgetId?: string) => void;
		};
	}
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstileScript(): Promise<void> {
	if (window.turnstile) return Promise.resolve();
	const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
	if (existing) {
		return new Promise((resolve, reject) => {
			existing.addEventListener('load', () => resolve(), { once: true });
			existing.addEventListener('error', () => reject(new Error('Turnstile script failed')), { once: true });
		});
	}
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.id = TURNSTILE_SCRIPT_ID;
		script.src = TURNSTILE_SCRIPT_SRC;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Turnstile script failed'));
		document.head.appendChild(script);
	});
}

export interface TurnstileWidgetHandle {
	reset: () => void;
}

interface TurnstileWidgetProps {
	siteKey: string;
	onToken: (token: string | null) => void;
	widgetRef?: MutableRefObject<TurnstileWidgetHandle | null>;
}

export function TurnstileWidget({ siteKey, onToken, widgetRef }: TurnstileWidgetProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const widgetIdRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const container = containerRef.current;
		if (!container || !siteKey) return;

		const handle: TurnstileWidgetHandle = {
			reset: () => {
				if (widgetIdRef.current && window.turnstile) {
					window.turnstile.reset(widgetIdRef.current);
				}
				onToken(null);
			},
		};
		if (widgetRef) widgetRef.current = handle;

		void loadTurnstileScript()
			.then(() => {
				if (cancelled || !window.turnstile || !containerRef.current) return;
				widgetIdRef.current = window.turnstile.render(containerRef.current, {
					sitekey: siteKey,
					callback: (token) => onToken(token),
					'expired-callback': () => onToken(null),
					'error-callback': () => onToken(null),
				});
			})
			.catch(() => {
				if (!cancelled) onToken(null);
			});

		return () => {
			cancelled = true;
			if (widgetRef) widgetRef.current = null;
			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.remove(widgetIdRef.current);
				widgetIdRef.current = null;
			}
		};
	}, [siteKey, onToken, widgetRef]);

	return <div ref={containerRef} className="flex justify-center" />;
}

export function getTurnstileSiteKey(): string {
	return import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
}
