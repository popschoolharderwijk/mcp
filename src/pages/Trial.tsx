import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type LessonTypeOption, LessonTypeSelect } from '@/components/ui/lesson-type-select';
import { useActiveLessonTypes } from '@/hooks/useActiveLessonTypes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type TrialState = 'idle' | 'sending' | 'sent';

export default function Trial() {
	const { user, isLoading } = useAuth();
	const { lessonTypes, loading: loadingLessonTypes } = useActiveLessonTypes(true);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [lessonTypeId, setLessonTypeId] = useState<string | null>(null);
	const [state, setState] = useState<TrialState>('idle');
	const [error, setError] = useState<string | null>(null);

	if (!isLoading && user) {
		return <Navigate to="/" replace />;
	}

	const options: LessonTypeOption[] = lessonTypes.map((lt) => ({
		id: lt.id,
		name: lt.name,
		icon: lt.icon ?? null,
		color: lt.color ?? null,
	}));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const trimmedFirst = firstName.trim();
		const trimmedLast = lastName.trim();
		if (!trimmedFirst || !trimmedLast) {
			setError('Voornaam en achternaam zijn verplicht');
			return;
		}
		if (!email.trim()) {
			setError('E-mailadres is verplicht');
			return;
		}
		if (!lessonTypeId) {
			setError('Selecteer een lessoort');
			return;
		}

		setState('sending');

		const { data: fnData, error: fnError } = await supabase.functions.invoke('submit-trial-request', {
			body: {
				email: email.trim().toLowerCase(),
				lesson_type_id: lessonTypeId,
				first_name: trimmedFirst,
				last_name: trimmedLast,
			},
		});

		if (fnError) {
			setError(fnError.message ?? 'Aanvraag mislukt');
			setState('idle');
			return;
		}

		const errMsg = typeof fnData?.error === 'string' ? fnData.error : fnData?.error?.message;
		if (errMsg) {
			setError(errMsg);
			setState('idle');
			return;
		}

		const { error: otpError } = await supabase.auth.signInWithOtp({
			email: email.trim().toLowerCase(),
			options: {
				shouldCreateUser: true,
				emailRedirectTo: `${window.location.origin}/auth/callback`,
				data: {
					first_name: trimmedFirst,
					last_name: trimmedLast,
				},
			},
		});

		if (otpError) {
			setError(otpError.message);
			setState('idle');
			return;
		}

		setState('sent');
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-muted-foreground">Laden...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">Proefles aanvragen</h1>
					<p className="text-muted-foreground mt-2">
						Vul je gegevens in. We sturen een link om in te loggen; daarna zie je de status van je proefles.
					</p>
				</div>

				{error && (
					<div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
						{error}
					</div>
				)}

				{state === 'sent' ? (
					<div className="bg-accent border border-border px-4 py-3 rounded-md">
						<p className="font-medium text-foreground">Check je e-mail</p>
						<p className="text-sm mt-1 text-muted-foreground">
							We hebben een link gestuurd naar <strong className="text-foreground">{email}</strong>. Log
							in om je proeflesstatus te zien. Als je binnen 24 uur niet inlogt, vervalt de aanvraag.
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<Label htmlFor="firstName">Voornaam *</Label>
							<Input
								id="firstName"
								type="text"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								placeholder="Voornaam"
								required
								disabled={state === 'sending'}
								className="mt-1"
							/>
						</div>
						<div>
							<Label htmlFor="lastName">Achternaam *</Label>
							<Input
								id="lastName"
								type="text"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								placeholder="Achternaam"
								required
								disabled={state === 'sending'}
								className="mt-1"
							/>
						</div>
						<div>
							<Label htmlFor="email">E-mail *</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="jouw@email.nl"
								required
								disabled={state === 'sending'}
								className="mt-1"
							/>
						</div>
						<div>
							<Label>Lessoort *</Label>
							<LessonTypeSelect
								options={options}
								value={lessonTypeId}
								onChange={setLessonTypeId}
								placeholder="Selecteer lessoort..."
								disabled={state === 'sending' || loadingLessonTypes}
								className="mt-1 w-full"
							/>
						</div>
						<Button type="submit" disabled={state === 'sending' || loadingLessonTypes} className="w-full">
							{state === 'sending' ? 'Bezig...' : 'Proefles aanvragen'}
						</Button>
					</form>
				)}

				<p className="text-center text-sm text-muted-foreground">
					Heb je al een account?{' '}
					<Link to="/login" className="text-primary hover:underline">
						Inloggen
					</Link>
				</p>
			</div>
		</div>
	);
}
