import { supabase } from '@/integrations/supabase/client';
import { formatDateToDb, now } from '@/lib/date/date-format';
import {
	type AwaitingMandateRow,
	filterAwaitingByInviteSent,
	isAwaitingMandate,
	type MandateLifecycleStatus,
	type MandateStatusRow,
	mapAwaitingMandateRow,
	mapMandateStatusRow,
	pickPrimarySubscriptionStatus,
	resolveMandateLifecycleStatus,
	sortMandateStatusRows,
} from '@/lib/subscriptions/awaitingMandateHelpers';
import type { MandatesTabCounts } from '@/lib/subscriptions/mandatesTabsHelpers';

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
	avatar_url: string | null;
};

type InviteRow = {
	lesson_agreement_id: string;
	sent_at: string;
	recipient_email: string;
};

type StudentParentRow = {
	user_id: string;
	parent_email: string | null;
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
	avatarUrl: string | null;
} {
	if (!profile) return { firstName: null, lastName: null, profileEmail: null, avatarUrl: null };
	return {
		firstName: profile.first_name,
		lastName: profile.last_name,
		profileEmail: profile.email,
		avatarUrl: profile.avatar_url,
	};
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
	parentEmails: Map<string, string | null>,
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
		parentEmail: parentEmails.get(row.student_user_id) ?? null,
		avatarUrl: fromProfile.avatarUrl,
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
	parentEmails: Map<string, string | null>,
	invites: Map<string, InviteRow>,
	today: string,
): AwaitingMandateRow[] {
	return candidates.map((row) => mapOneCandidate(row, profiles, parentEmails, invites, today));
}

function throwQueryError(error: { message: string } | null): void {
	if (error) throw new Error(error.message);
}

function toProfileMap(data: ProfileRow[] | null): Map<string, ProfileRow> {
	if (!data) return new Map();
	return new Map(data.map((p) => [p.user_id, p]));
}

function toParentEmailMap(data: StudentParentRow[] | null): Map<string, string | null> {
	if (!data) return new Map();
	return new Map(data.map((row) => [row.user_id, row.parent_email]));
}

async function loadParentEmailsByUserId(userIds: string[]): Promise<Map<string, string | null>> {
	if (userIds.length === 0) return new Map();
	const { data, error } = await supabase.from('students').select('user_id, parent_email').in('user_id', userIds);
	throwQueryError(error);
	return toParentEmailMap(data as StudentParentRow[] | null);
}

async function loadAwaitingSideData(candidates: AgreementQueryRow[]) {
	const studentUserIds = [...new Set(candidates.map((r) => r.student_user_id))];
	const [profilesRes, invitesRes, parentEmails] = await Promise.all([
		supabase
			.from('profiles')
			.select('user_id, first_name, last_name, email, avatar_url')
			.in('user_id', studentUserIds),
		supabase
			.from('stripe_checkout_invitations')
			.select('lesson_agreement_id, sent_at, recipient_email')
			.in(
				'lesson_agreement_id',
				candidates.map((r) => r.id),
			),
		loadParentEmailsByUserId(studentUserIds),
	]);
	throwQueryError(profilesRes.error);
	throwQueryError(invitesRes.error);
	return {
		profiles: toProfileMap(profilesRes.data as ProfileRow[] | null),
		parentEmails,
		invites: latestInviteByAgreement(invitesRes.data as InviteRow[] | null),
	};
}

const AGREEMENT_MANDATE_SELECT = `
			id, student_user_id, start_date, end_date, created_at, is_active, stripe_schedule_id,
			lesson_types ( name ),
			subscriptions ( status, stripe_schedule_id, stripe_subscription_id )
		`;

function unwrapAgreementRows(result: { data: unknown; error: { message: string } | null }): AgreementQueryRow[] {
	if (result.error) throw new Error(result.error.message);
	return (result.data ?? []) as AgreementQueryRow[];
}

async function fetchActiveAgreementsWithoutSchedule(): Promise<AgreementQueryRow[]> {
	return unwrapAgreementRows(
		await supabase
			.from('lesson_agreements')
			.select(AGREEMENT_MANDATE_SELECT)
			.eq('is_active', true)
			.is('stripe_schedule_id', null),
	);
}

async function fetchAgreementsWithSchedule(): Promise<AgreementQueryRow[]> {
	return unwrapAgreementRows(
		await supabase.from('lesson_agreements').select(AGREEMENT_MANDATE_SELECT).not('stripe_schedule_id', 'is', null),
	);
}

async function fetchAgreementsByIds(ids: string[]): Promise<AgreementQueryRow[]> {
	if (ids.length === 0) return [];
	return unwrapAgreementRows(await supabase.from('lesson_agreements').select(AGREEMENT_MANDATE_SELECT).in('id', ids));
}

/** Agreements with a live schedule and/or any subscription mirror (including canceled). */
async function fetchAgreementsWithMandateHistory(): Promise<AgreementQueryRow[]> {
	const withSchedule = await fetchAgreementsWithSchedule();
	const knownIds = new Set(withSchedule.map((row) => row.id));
	const { data: subscriptionLinks, error } = await supabase.from('subscriptions').select('lesson_agreement_id');
	throwQueryError(error);
	const missingIds = [
		...new Set(
			(subscriptionLinks ?? [])
				.map((row) => row.lesson_agreement_id as string)
				.filter((id) => id && !knownIds.has(id)),
		),
	];
	const extras = await fetchAgreementsByIds(missingIds);
	return [...withSchedule, ...extras];
}

/** Active agreements waiting on a Stripe mandate (+ last checkout invitation). */
export async function fetchAwaitingMandates(): Promise<AwaitingMandateRow[]> {
	const today = formatDateToDb(now());
	const candidates = filterAwaitingCandidates(await fetchActiveAgreementsWithoutSchedule(), today);
	if (candidates.length === 0) return [];
	const side = await loadAwaitingSideData(candidates);
	return mapCandidates(candidates, side.profiles, side.parentEmails, side.invites, today);
}

function toMandateInput(row: AgreementQueryRow) {
	return {
		isActive: row.is_active,
		endDate: row.end_date,
		stripeScheduleId: row.stripe_schedule_id,
		subscriptions: row.subscriptions ?? [],
	};
}

function filterLifecycleCandidates(
	rows: AgreementQueryRow[],
	lifecycle: Exclude<MandateLifecycleStatus, 'pending'>,
	today: string,
): AgreementQueryRow[] {
	return rows.filter((row) => resolveMandateLifecycleStatus(toMandateInput(row), today) === lifecycle);
}

function mapLifecycleCandidates(
	candidates: AgreementQueryRow[],
	profiles: Map<string, ProfileRow>,
	parentEmails: Map<string, string | null>,
	lifecycle: 'active' | 'canceled',
): MandateStatusRow[] {
	return candidates.map((row) => {
		const fromProfile = profileFields(profiles.get(row.student_user_id));
		return mapMandateStatusRow({
			lessonAgreementId: row.id,
			studentUserId: row.student_user_id,
			firstName: fromProfile.firstName,
			lastName: fromProfile.lastName,
			profileEmail: fromProfile.profileEmail,
			parentEmail: parentEmails.get(row.student_user_id) ?? null,
			avatarUrl: fromProfile.avatarUrl,
			lessonType: row.lesson_types,
			startDate: row.start_date,
			agreementActive: row.is_active,
			subscriptionStatus: pickPrimarySubscriptionStatus(row.subscriptions ?? []),
			lifecycleStatus: lifecycle,
		});
	});
}

/** Agreements with a collected Stripe mandate in the given lifecycle bucket. */
export async function fetchMandatesByLifecycle(lifecycle: 'active' | 'canceled'): Promise<MandateStatusRow[]> {
	const today = formatDateToDb(now());
	const candidates = filterLifecycleCandidates(await fetchAgreementsWithMandateHistory(), lifecycle, today);
	if (candidates.length === 0) return [];
	const studentUserIds = [...new Set(candidates.map((r) => r.student_user_id))];
	const [profilesRes, parentEmails] = await Promise.all([
		supabase
			.from('profiles')
			.select('user_id, first_name, last_name, email, avatar_url')
			.in('user_id', studentUserIds),
		loadParentEmailsByUserId(studentUserIds),
	]);
	throwQueryError(profilesRes.error);
	return sortMandateStatusRows(
		mapLifecycleCandidates(
			candidates,
			toProfileMap(profilesRes.data as ProfileRow[] | null),
			parentEmails,
			lifecycle,
		),
	);
}

/** Counts for Mandates tab labels (`Label (n)`). */
export async function fetchMandatesTabCounts(): Promise<MandatesTabCounts> {
	const [active, canceled, awaiting] = await Promise.all([
		fetchMandatesByLifecycle('active'),
		fetchMandatesByLifecycle('canceled'),
		fetchAwaitingMandates(),
	]);
	return {
		active: active.length,
		canceled: canceled.length,
		pending: filterAwaitingByInviteSent(awaiting, true).length,
		unsent: filterAwaitingByInviteSent(awaiting, false).length,
	};
}
