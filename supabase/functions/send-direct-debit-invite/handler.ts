import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl, type LessonAgreementPostContext } from '../_shared/http-serve.ts';
import {
	readBillingKind,
	resolveNotStripeAgreementFailure,
	resolveOneOffAgreementFailure,
} from '../_shared/paymentMethodPure.ts';
import { sendTemplateEmail } from '../_shared/sendTemplateEmail.ts';
import { getSafeErrorMessage } from '../_shared/stripe.ts';
import { fetchUserRole, requireAuthenticatedClients } from '../_shared/supabase.ts';
import {
	buildDirectDebitInviteLink,
	buildDirectDebitInviteRedirectUrl,
	buildDirectDebitInviteSuccessPayload,
	buildDirectDebitInviteVars,
	formatInviteLessonForm,
	formatInviteName,
	type InviteFee,
	isDirectDebitInvitePrivilegedRole,
	resolveDirectDebitAgreementAccessError,
	resolveDirectDebitInviteMissingEmailResponse,
	resolveDirectDebitInviteRecipient,
	resolveInviteFeeMonths,
	resolveInviteRecipientName,
} from './sendDirectDebitInvitePure.ts';

const INVITE_EVENT_KEY = 'direct_debit_invite';

interface InviteAgreement {
	id: string;
	student_user_id: string;
	is_active: boolean;
	payment_method: string;
	lesson_type_option_id: string | null;
	start_date: string;
	end_date: string | null;
	cancellation_effective_date: string | null;
	minimum_term_end: string | null;
	lesson_types: { name: string } | null;
	lesson_type_options: {
		billing_kind: string;
		duration_minutes: number;
		frequency: string;
		label: string | null;
	} | null;
}

type Prepared =
	| { ok: false; response: Response }
	| {
			ok: true;
			admin: SupabaseClient;
			userId: string;
			agreement: InviteAgreement;
			recipient: string;
			redirectTo: string;
	  };

const fail = (status: number, error: string): { ok: false; response: Response } => ({
	ok: false,
	response: jsonResponse(status, { error }),
});

async function prepareDirectDebitInvite(ctx: LessonAgreementPostContext): Promise<Prepared> {
	const auth = await requireAuthenticatedClients(ctx.authHeader);
	if (!auth.ok) return { ok: false, response: auth.response };

	const role = await fetchUserRole(auth.userClient, auth.user.id);
	const isPrivileged = isDirectDebitInvitePrivilegedRole(role);

	const { data, error: agErr } = await auth.admin
		.from('lesson_agreements')
		.select(
			'id, student_user_id, is_active, payment_method, lesson_type_option_id, start_date, end_date, cancellation_effective_date, minimum_term_end, lesson_types(name), lesson_type_options(billing_kind, duration_minutes, frequency, label)',
		)
		.eq('id', ctx.lessonAgreementId)
		.maybeSingle();
	const agreement = data as InviteAgreement | null;
	const access = resolveDirectDebitAgreementAccessError(agreement, agErr, isPrivileged, auth.user.id);
	if (!access.ok || !agreement) return fail(access.ok ? 404 : access.status, access.ok ? '' : access.error);

	const notStripe = resolveNotStripeAgreementFailure(agreement.payment_method);
	if (notStripe) return fail(notStripe.status, notStripe.error);
	const oneOff = resolveOneOffAgreementFailure(readBillingKind(agreement.lesson_type_options));
	if (oneOff) return fail(oneOff.status, oneOff.error);

	const { data: profile } = await auth.admin
		.from('profiles')
		.select('email')
		.eq('user_id', agreement.student_user_id)
		.maybeSingle();
	const recipient = resolveDirectDebitInviteRecipient(profile?.email);
	if (!recipient) {
		const missing = resolveDirectDebitInviteMissingEmailResponse();
		return fail(missing.status, missing.error);
	}

	return {
		ok: true,
		admin: auth.admin,
		userId: auth.user.id,
		agreement,
		recipient,
		redirectTo: buildDirectDebitInviteRedirectUrl(getSiteBaseUrl(ctx.req), agreement.id),
	};
}

async function fetchFee(
	admin: SupabaseClient,
	agreement: InviteAgreement,
	dateOfBirth: string | null,
	month: string,
): Promise<InviteFee> {
	const ends = [agreement.end_date, agreement.cancellation_effective_date].filter((d): d is string => Boolean(d));
	const { data, error } = await admin.rpc('preview_lesson_fee', {
		p_lesson_type_option_id: agreement.lesson_type_option_id,
		p_date_of_birth: dateOfBirth,
		p_start_date: agreement.start_date,
		p_end_date: ends.length ? ends.sort()[0] : null,
		p_month: month,
	});
	if (error) throw new Error(error.message);
	const row = (data ?? [])[0] as InviteFee | undefined;
	if (!row) throw new Error('Geen bedrag berekend');
	return row;
}

async function sendDirectDebitInviteEmail(prepared: Extract<Prepared, { ok: true }>, origin: string | null) {
	const { admin, agreement } = prepared;
	if (!agreement.lesson_type_option_id) {
		return jsonResponse(422, { error: 'Deze overeenkomst heeft nog geen lesvorm met tarief.' });
	}

	const [{ data: profile }, { data: student }] = await Promise.all([
		admin.from('profiles').select('first_name, last_name').eq('user_id', agreement.student_user_id).maybeSingle(),
		admin
			.from('students')
			.select('date_of_birth, parent_name, debtor_name, debtor_info_same_as_student')
			.eq('user_id', agreement.student_user_id)
			.maybeSingle(),
	]);

	let firstFee: InviteFee;
	let regularFee: InviteFee;
	try {
		const [m1, m2] = resolveInviteFeeMonths(agreement.start_date);
		[firstFee, regularFee] = await Promise.all([
			fetchFee(admin, agreement, student?.date_of_birth ?? null, m1),
			fetchFee(admin, agreement, student?.date_of_birth ?? null, m2),
		]);
	} catch (err) {
		console.error('preview_lesson_fee error', err);
		return jsonResponse(422, { error: getSafeErrorMessage(err, 'Kon het lesgeld niet berekenen') });
	}

	// Server-side link: no Supabase mail is sent. Only existing users (recipient comes from profiles),
	// so no account is created — same as shouldCreateUser: false.
	const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
		type: 'magiclink',
		email: prepared.recipient,
		options: { redirectTo: prepared.redirectTo },
	});
	const hashedToken = linkData?.properties?.hashed_token;
	if (linkErr || !hashedToken) {
		console.error('generateLink error', linkErr);
		return jsonResponse(502, { error: getSafeErrorMessage(linkErr, 'Kon geen inloglink maken') });
	}

	const studentName = formatInviteName(profile?.first_name, profile?.last_name);
	const vars = buildDirectDebitInviteVars({
		studentName,
		recipientName: resolveInviteRecipientName({
			studentName,
			parentName: student?.parent_name,
			debtorName: student?.debtor_name,
			debtorSameAsStudent: student?.debtor_info_same_as_student,
		}),
		lessonForm: formatInviteLessonForm(agreement.lesson_types?.name ?? 'Les', agreement.lesson_type_options),
		firstFee,
		regularFee,
		startDate: agreement.start_date,
		minimumTermEnd: agreement.minimum_term_end,
		link: buildDirectDebitInviteLink(prepared.redirectTo, hashedToken),
	});

	const sent = await sendTemplateEmail({ event_key: INVITE_EVENT_KEY, to: prepared.recipient, vars, origin });
	if (!sent) return jsonResponse(502, { error: 'Versturen van de uitnodiging is mislukt' });

	await admin.from('direct_debit_invitations').insert({
		lesson_agreement_id: agreement.id,
		recipient_email: prepared.recipient,
		sent_by: prepared.userId,
	});

	return jsonResponse(200, buildDirectDebitInviteSuccessPayload(prepared.recipient));
}

export async function handleSendDirectDebitInvite(ctx: LessonAgreementPostContext): Promise<Response> {
	const prepared = await prepareDirectDebitInvite(ctx);
	if (!prepared.ok) return prepared.response;
	return sendDirectDebitInviteEmail(prepared, ctx.req.headers.get('origin'));
}
