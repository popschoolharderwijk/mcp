import { LuFingerprint, LuLoaderCircle } from 'react-icons/lu';
import {
	canSubmitOtp,
	type LoginState,
	resolveMagicLinkSubmitLabel,
	resolvePasskeySignInButtonLabel,
} from '@/lib/auth/loginHelpers';

interface LoginMagicLinkFormProps {
	email: string;
	state: LoginState;
	onEmailChange: (value: string) => void;
	onSubmit: (event: React.FormEvent) => void;
	onPasskeySignIn: () => void;
}

export function LoginMagicLinkForm({
	email,
	state,
	onEmailChange,
	onSubmit,
	onPasskeySignIn,
}: LoginMagicLinkFormProps) {
	const passkeyBusy = state === 'passkey';
	const formDisabled = state === 'sending' || passkeyBusy;

	return (
		<div className="space-y-4">
			<form onSubmit={onSubmit} className="space-y-4">
				<div>
					<label htmlFor="email" className="block text-sm font-medium mb-1">
						Email
					</label>
					<input
						id="email"
						type="email"
						name="username"
						autoComplete="username webauthn"
						value={email}
						onChange={(event) => onEmailChange(event.target.value)}
						placeholder="jouw@email.nl"
						required
						disabled={formDisabled}
						className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
					/>
				</div>
				<button
					type="submit"
					disabled={formDisabled}
					className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
				>
					{resolveMagicLinkSubmitLabel(state === 'sending')}
				</button>
			</form>

			<div className="relative py-1">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-border" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background px-2 text-muted-foreground">of</span>
				</div>
			</div>

			<button
				type="button"
				onClick={onPasskeySignIn}
				disabled={formDisabled}
				className="w-full py-2 px-4 border border-input bg-background rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 inline-flex items-center justify-center gap-2"
			>
				{passkeyBusy ? (
					<LuLoaderCircle className="h-4 w-4 animate-spin" />
				) : (
					<LuFingerprint className="h-4 w-4" />
				)}
				{resolvePasskeySignInButtonLabel(passkeyBusy)}
			</button>
		</div>
	);
}

interface LoginOtpFormProps {
	email: string;
	otp: string;
	state: LoginState;
	onOtpChange: (value: string) => void;
	onSubmit: (event: React.FormEvent) => void;
	onReset: () => void;
}

export function LoginOtpForm({ email, otp, state, onOtpChange, onSubmit, onReset }: LoginOtpFormProps) {
	return (
		<div className="space-y-4">
			<div className="bg-accent border border-border px-4 py-3 rounded">
				<p className="font-medium text-foreground">Check je email!</p>
				<p className="text-sm mt-1 text-muted-foreground">
					Als het emailadres <strong className="text-foreground">{email}</strong> bij ons bekend is, ontvang
					je een magic link om in te loggen.
				</p>
				<p className="text-sm mt-1 text-muted-foreground">Klik op de link of voer de code hieronder in.</p>
			</div>

			<form onSubmit={onSubmit} className="space-y-4">
				<div>
					<label htmlFor="otp" className="block text-sm font-medium mb-1">
						Of voer de code in
					</label>
					<input
						id="otp"
						type="text"
						inputMode="numeric"
						pattern="[0-9]{6,8}"
						maxLength={8}
						value={otp}
						onChange={(event) => onOtpChange(event.target.value)}
						placeholder="00000000"
						disabled={state === 'verifying'}
						className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 text-center text-2xl tracking-widest"
					/>
				</div>
				<button
					type="submit"
					disabled={!canSubmitOtp(state, otp.length)}
					className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
				>
					{state === 'verifying' ? 'Verifiëren...' : 'Verifieer Code'}
				</button>
			</form>

			<button
				type="button"
				onClick={onReset}
				className="w-full py-2 px-4 text-muted-foreground hover:text-foreground"
			>
				← Ander emailadres gebruiken
			</button>
		</div>
	);
}
