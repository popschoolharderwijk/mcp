import { supabase } from '@/integrations/supabase/client';
import { formatDateToDb, now } from '@/lib/date/date-format';
import {
	type AwaitingMandateRow,
	isAwaitingMandate,
	mapAwaitingMandateRow,
} from '@/lib/subscriptions/awaitingMandateHelpers';

type AgreementQueryRow = {
	id: string;
	student_user_id: string;
	start_date: string;
	end_date: string | null;
	created_at: string;
	is_active: boolean;
	stripe_schedule_id: string | null;
	lesson_types: { name: string } | { name: string }[] | null;
	subscriptions: Array<{
		status: string | null;
		stripe_schedule_id: string | null;
		stripe_subscription_id: string | null;
	}> | null;
};

type ProfileRow = {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	email: string;
};

type InviteRow = {
	lesson_agreement_id: string;
	sent_at: string;
	recipient_email: string;
};

function shouldReplaceInvite(existing: InviteRow | undefined, invite: InviteRow): boolean {
	if (!existing) return true;
	return invite.sent_at > existing.sent_at;
}

function latestInviteByAgreement(invites: InviteRow[] | null): Map<string, InviteRow> {
	const map = new Map<string, InviteRow>();
	if (!invites) return map;
	for (const invite of invites) {
		if (shouldReplaceInvite(map.get(invite.lesson_agreement_id), invite)) {
			map.set(invite.lesson_agreement_id, invite);
		}
	}
	return map;
}

function filterAwaitingCandidates(rows: AgreementQueryRow[], today: string): AgreementQueryRow[] {
	return rows.filter((row) =>
		isAwaitingMandate(
			{
				isActive: row.is_active,
				endDate: row.end_date,
				stripeScheduleId: row.stripe_schedule_id,
				subscriptions: row.subscriptions ?? [],
			},
			today,
		),
	);
}

function profileFields(profile: ProfileRow | undefined): {
	firstName: string | null;
	lastName: string | null;
	profileEmail: string | null;
} {
	if (!profile) return { firstName: null, lastName: null, profileEmail: null };
	return { firstName: profile.first_name, lastName: profile.last_name, profileEmail: profile.email };
}

function inviteFields(invite: InviteRow | undefined): {
	inviteEmail: string | null;
	lastSentAt: string | null;
} {
	if (!invite) return { inviteEmail: null, lastSentAt: null };
	return { inviteEmail: invite.recipient_email, lastSentAt: invite.sent_at };
}

function mapOneCandidate(
	row: AgreementQueryRow,
	profiles: Map<string, ProfileRow>,
	invites: Map<string, InviteRow>,
	today: string,
): AwaitingMandateRow {
	const fromProfile = profileFields(profiles.get(row.student_user_id));
	const fromInvite = inviteFields(invites.get(row.id));
	return mapAwaitingMandateRow({
		lessonAgreementId: row.id,
		studentUserId: row.student_user_id,
		firstName: fromProfile.firstName,
		lastName: fromProfile.lastName,
		profileEmail: fromProfile.profileEmail,
		inviteEmail: fromInvite.inviteEmail,
		lessonType: row.lesson_types,
		startDate: row.start_date,
		createdAt: row.created_at,
		lastSentAt: fromInvite.lastSentAt,
		today,
	});
}

function mapCandidates(
	candidates: AgreementQueryRow[],
	profiles: Map<string, ProfileRow>,
	invites: Map<string, InviteRow>,
	today: string,
): AwaitingMandateRow[] {
	return candidates.map((row) => mapOneCandidate(row, profiles, invites, today));
}

function throwQueryError(error: { message: string } | null): void {
	if (error) throw new Error(error.message);
}

function toProfileMap(data: ProfileRow[] | null): Map<string, ProfileRow> {
	if (!data) return new Map();
	return new Map(data.map((p) => [p.user_id, p]));
}

async function loadAwaitingSideData(candidates: AgreementQueryRow[]) {
	const [profilesRes, invitesRes] = await Promise.all([
		supabase
			.from('profiles')
			.select('user_id, first_name, last_name, email')
			.in('user_id', [...new Set(candidates.map((r) => r.student_user_id))]),
		supabase
			.from('stripe_checkout_invitations')
			.select('lesson_agreement_id, sent_at, recipient_email')
			.in(
				'lesson_agreement_id',
				candidates.map((r) => r.id),
			),
	]);
	throwQueryError(profilesRes.error);
	throwQueryError(invitesRes.error);
	return {
		profiles: toProfileMap(profilesRes.data as ProfileRow[] | null),
		invites: latestInviteByAgreement(invitesRes.data as InviteRow[] | null),
	};
}

/** Active agreements waiting on a Stripe mandate (+ last checkout invitation). */
export async function fetchAwaitingMandates(): Promise<AwaitingMandateRow[]> {
	const today = formatDateToDb(now());
	const { data, error } = await supabase
		.from('lesson_agreements')
		.select(
			`
			id, student_user_id, start_date, end_date, created_at, is_active, stripe_schedule_id,
			lesson_types ( name ),
			subscriptions ( status, stripe_schedule_id, stripe_subscription_id )
		`,
		)
		.eq('is_active', true)
		.is('stripe_schedule_id', null);
	if (error) throw new Error(error.message);
	const candidates = filterAwaitingCandidates((data ?? []) as AgreementQueryRow[], today);
	if (candidates.length === 0) return [];
	const side = await loadAwaitingSideData(candidates);
	return mapCandidates(candidates, side.profiles, side.invites, today);
}

export async function countAwaitingMandates(): Promise<number> {
	try {
		return (await fetchAwaitingMandates()).length;
	} catch {
		return 0;
	}
}
