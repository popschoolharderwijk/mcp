import * as React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { SiSignal } from 'react-icons/si';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface PhoneInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	error?: string;
}

/** NL national 10-digit number → E.164 digits without +, e.g. 0612345678 → 31612345678. */
function toNetherlandsInternationalDigits(phoneDigits: string): string | null {
	if (phoneDigits.length !== 10 || !phoneDigits.startsWith('0')) return null;
	return `31${phoneDigits.slice(1)}`;
}

function buildWhatsAppChatUrl(phoneDigits: string): string | null {
	const international = toNetherlandsInternationalDigits(phoneDigits);
	return international ? `https://wa.me/${international}` : null;
}

function buildSignalChatUrl(phoneDigits: string): string | null {
	const international = toNetherlandsInternationalDigits(phoneDigits);
	return international ? `https://signal.me/#p/+${international}` : null;
}

const chatLinkClassName =
	'inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-sm text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function PhoneChatLink(props: { href: string; ariaLabel: string; tooltip: string; children: React.ReactNode }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<a
					href={props.href}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={props.ariaLabel}
					className={chatLinkClassName}
				>
					{props.children}
				</a>
			</TooltipTrigger>
			<TooltipContent>
				<p>{props.tooltip}</p>
			</TooltipContent>
		</Tooltip>
	);
}

/**
 * Phone number input component that validates 10 digits.
 * Only allows numeric input and enforces exactly 10 digits.
 * When valid, shows WhatsApp and Signal deep links beside the field.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
	({ value, onChange, label, error, className, id, ...props }, ref) => {
		const generatedId = React.useId();
		const inputId = id ?? generatedId;
		const errorId = `${inputId}-error`;

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const digitsOnly = e.target.value.replace(/\D/g, '');
			const limited = digitsOnly.slice(0, 10);
			onChange(limited);
		};

		const isValid = value === '' || value.length === 10;
		const showLengthError = !error && !isValid && value !== '';
		const isInvalid = Boolean(error) || showLengthError;
		const errorMessage = error ?? (showLengthError ? 'Telefoonnummer moet precies 10 cijfers zijn' : undefined);
		const whatsAppUrl = buildWhatsAppChatUrl(value);
		const signalUrl = buildSignalChatUrl(value);
		const showChatLinks = Boolean(whatsAppUrl || signalUrl);

		return (
			<div className="w-full space-y-1.5 sm:w-1/2 sm:pr-2">
				{label && <Label htmlFor={inputId}>{label}</Label>}
				<div className="flex items-center gap-1">
					<Input
						ref={ref}
						id={inputId}
						type="tel"
						value={value}
						onChange={handleChange}
						placeholder="0612345678"
						maxLength={10}
						className={cn(
							'min-w-0 flex-1',
							isInvalid ? 'border-destructive focus-visible:ring-destructive' : '',
							className,
						)}
						{...props}
						aria-invalid={isInvalid ? 'true' : 'false'}
						aria-describedby={isInvalid ? errorId : undefined}
					/>
					{showChatLinks ? (
						<TooltipProvider>
							<span className="inline-flex items-center gap-1" data-tip-target="phone-chat-links">
								{whatsAppUrl ? (
									<PhoneChatLink
										href={whatsAppUrl}
										ariaLabel="WhatsApp openen"
										tooltip="Open in WhatsApp"
									>
										<FaWhatsapp className="h-5 w-5" aria-hidden />
									</PhoneChatLink>
								) : null}
								{signalUrl ? (
									<PhoneChatLink href={signalUrl} ariaLabel="Signal openen" tooltip="Open in Signal">
										<SiSignal className="h-4 w-4" aria-hidden />
									</PhoneChatLink>
								) : null}
							</span>
						</TooltipProvider>
					) : null}
				</div>
				{errorMessage && (
					<p id={errorId} className="text-sm text-destructive">
						{errorMessage}
					</p>
				)}
			</div>
		);
	},
);
PhoneInput.displayName = 'PhoneInput';
