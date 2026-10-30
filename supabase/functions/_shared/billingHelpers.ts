/** Pure billing helpers shared by Deno edge functions (no Deno/Stripe/Supabase imports). */
/** School-year bounds mirror src/lib/billing/schoolYear.ts + app_settings.school_year bootstrap. */

import { resolveSchoolYearStartAndEndYear } from './schoolYearStartYearHelpers.ts';

export type LessonFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface SchoolYearBounds {
	start_month: number;
	end_month: number;
}

/** Bootstrap default — keep in sync with supabase/seeds/bootstrap.sql app_settings.school_year. */
const DEFAULT_SCHOOL_YEAR_BOUNDS: SchoolYearBounds = {
	start_month: 9,
	end_month: 7,
};

/** Bootstrap VAT age threshold — sync with app_settings.vat. */
const DEFAULT_VAT_AGE_THRESHOLD_YEARS = 21;

function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

function ymd(d: Date): string {
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function monthDayOrdinal(month: number, day: number): number {
	return month * 100 + day;
}

export interface SchoolYearWindow {
	start: string;
	end: string;
	startYear: number;
}

function lastDayOfMonthUtc(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getSchoolYearForDateString(
	dateStr: string,
	bounds: SchoolYearBounds = DEFAULT_SCHOOL_YEAR_BOUNDS,
): SchoolYearWindow {
	const d = new Date(`${dateStr}T12:00:00Z`);
	const year = d.getUTCFullYear();
	const month = d.getUTCMonth() + 1;
	const day = d.getUTCDate();
	const asOf = monthDayOrdinal(month, day);
	const startOrd = monthDayOrdinal(bounds.start_month, 1);
	const endOrd = monthDayOrdinal(bounds.end_month, lastDayOfMonthUtc(2024, bounds.end_month));

	const { startYear, endYear } = resolveSchoolYearStartAndEndYear(year, asOf, startOrd, endOrd);
	return {
		startYear,
		start: `${startYear}-${pad(bounds.start_month)}-01`,
		end: `${endYear}-${pad(bounds.end_month)}-${pad(lastDayOfMonthUtc(endYear, bounds.end_month))}`,
	};
}

function billingMonthsPerSchoolYear(bounds: SchoolYearBounds = DEFAULT_SCHOOL_YEAR_BOUNDS): number {
	const sample = getSchoolYearForDateString(`${new Date().getUTCFullYear()}-10-15`, bounds);
	const start = new Date(`${sample.start}T12:00:00Z`);
	const end = new Date(`${sample.end}T12:00:00Z`);
	return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
}

/** Bootstrap billing month count for existing tests and callers with default school year. */
export const BILLING_MONTHS_PER_YEAR = billingMonthsPerSchoolYear(DEFAULT_SCHOOL_YEAR_BOUNDS);

function isNonBillingDateString(dateStr: string, bounds: SchoolYearBounds = DEFAULT_SCHOOL_YEAR_BOUNDS): boolean {
	const window = getSchoolYearForDateString(dateStr, bounds);
	return dateStr < window.start || dateStr > window.end;
}

export function clampToSchoolYear(
	sy: SchoolYearWindow,
	agreementStart: string,
	agreementEnd: string | null,
): { start: string; end: string } | null {
	const start = agreementStart > sy.start ? agreementStart : sy.start;
	const end = agreementEnd && agreementEnd < sy.end ? agreementEnd : sy.end;
	if (start > end) return null;
	return { start, end };
}

/** Step a date by one frequency interval (UTC, mutates). */
function addInterval(d: Date, f: LessonFrequency): void {
	if (f === 'daily') {
		d.setUTCDate(d.getUTCDate() + 1);
		return;
	}
	if (f === 'weekly') {
		d.setUTCDate(d.getUTCDate() + 7);
		return;
	}
	if (f === 'biweekly') {
		d.setUTCDate(d.getUTCDate() + 14);
		return;
	}
	const day = d.getUTCDate();
	d.setUTCMonth(d.getUTCMonth() + 1);
	const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
	d.setUTCDate(Math.min(day, last));
}

function alignOccurrenceCursor(cur: Date, dayOfWeek: number, frequency: LessonFrequency): void {
	if (frequency !== 'weekly' && frequency !== 'biweekly') return;
	const diff = (dayOfWeek - cur.getUTCDay() + 7) % 7;
	cur.setUTCDate(cur.getUTCDate() + diff);
}

/** Generate occurrence YYYY-MM-DD strings for the given pattern in [start,end]. */
export function getOccurrenceDates(
	dayOfWeek: number,
	startStr: string,
	endStr: string,
	frequency: LessonFrequency,
): string[] {
	const start = new Date(`${startStr}T12:00:00Z`);
	const end = new Date(`${endStr}T12:00:00Z`);
	const cur = new Date(start);
	alignOccurrenceCursor(cur, dayOfWeek, frequency);
	const out: string[] = [];
	while (cur <= end) {
		out.push(ymd(cur));
		addInterval(cur, frequency);
	}
	return out;
}

export interface NoLessonPeriod {
	start_date: string;
	end_date: string;
}

function isInNoLessonPeriod(date: string, periods: ReadonlyArray<NoLessonPeriod>): boolean {
	return periods.some((p) => date >= p.start_date && date <= p.end_date);
}

export interface YearlyResult {
	lessonsCount: number;
	yearlyCents: number;
	monthlyCents: number;
	leftoverCents: number;
	lessonDates: string[];
}

export function calculateYearly(input: {
	periodStart: string;
	periodEnd: string;
	dayOfWeek: number;
	frequency: LessonFrequency;
	pricePerLessonCents: number;
	noLessonPeriods: ReadonlyArray<NoLessonPeriod>;
	schoolYearBounds?: SchoolYearBounds;
}): YearlyResult {
	const bounds = input.schoolYearBounds ?? DEFAULT_SCHOOL_YEAR_BOUNDS;
	const billingMonths = billingMonthsPerSchoolYear(bounds);
	const all = getOccurrenceDates(input.dayOfWeek, input.periodStart, input.periodEnd, input.frequency);
	const lessonDates = all.filter(
		(d) => !isNonBillingDateString(d, bounds) && !isInNoLessonPeriod(d, input.noLessonPeriods),
	);
	const lessonsCount = lessonDates.length;
	const yearlyCents = lessonsCount * input.pricePerLessonCents;
	const monthlyCents = Math.floor(yearlyCents / billingMonths);
	const leftoverCents = yearlyCents - monthlyCents * billingMonths;
	return { lessonsCount, yearlyCents, monthlyCents, leftoverCents, lessonDates };
}

export type AgeTariff = 'youth' | 'adult';

export function pickAgeTariff(
	dob: string | null | undefined,
	onDate: string,
	ageThresholdYears: number = DEFAULT_VAT_AGE_THRESHOLD_YEARS,
): AgeTariff {
	if (!dob) return 'adult';
	const ref = new Date(`${onDate}T12:00:00Z`);
	const birth = new Date(`${dob}T12:00:00Z`);
	const thresholdBirthday = new Date(birth);
	thresholdBirthday.setUTCFullYear(thresholdBirthday.getUTCFullYear() + ageThresholdYears);
	return ref >= thresholdBirthday ? 'adult' : 'youth';
}

export interface BillingPhase {
	startUnix: number;
	endUnix: number;
	amountCents: number;
	label: string;
}

function collectBillingMonths(
	periodStart: string,
	periodEnd: string,
	bounds: SchoolYearBounds = DEFAULT_SCHOOL_YEAR_BOUNDS,
): Date[] {
	const start = new Date(`${periodStart}T00:00:00Z`);
	const end = new Date(`${periodEnd}T00:00:00Z`);
	let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
	const months: Date[] = [];
	while (cursor <= end) {
		const probe = `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-15`;
		if (!isNonBillingDateString(probe, bounds)) months.push(new Date(cursor));
		cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
	}
	return months;
}

function phaseWindowForMonth(
	months: Date[],
	index: number,
	periodStart: Date,
	periodEnd: Date,
): { startUnix: number; endUnix: number } {
	const month = months[index];
	const next =
		index + 1 < months.length
			? months[index + 1]
			: new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 1, 1));
	const phaseStart = index === 0 ? periodStart : month;
	return {
		startUnix: Math.floor(phaseStart.getTime() / 1000),
		endUnix: Math.floor(next.getTime() / 1000),
	};
}

/** Build the 11 monthly phases for a school year, with leftover on the last (July) phase. */
export function buildPhases(
	periodStart: string,
	periodEnd: string,
	monthlyCents: number,
	leftoverCents: number,
): BillingPhase[] {
	const start = new Date(`${periodStart}T00:00:00Z`);
	const end = new Date(`${periodEnd}T00:00:00Z`);
	const months = collectBillingMonths(periodStart, periodEnd);
	return months.map((month, index) => {
		const { startUnix, endUnix } = phaseWindowForMonth(months, index, start, end);
		const isLast = index === months.length - 1;
		return {
			startUnix,
			endUnix,
			amountCents: monthlyCents + (isLast ? leftoverCents : 0),
			label: `${month.getUTCFullYear()}-${pad(month.getUTCMonth() + 1)}`,
		};
	});
}

export function resolveBillingReferenceDate(agreementStart: string, today: string): string {
	return agreementStart > today ? agreementStart : today;
}

export function pickPriceCentsForTariff(
	option: {
		price_per_lesson_youth_cents: number | null;
		price_per_lesson_adult_cents: number | null;
	},
	tariff: AgeTariff,
): number | null {
	return tariff === 'youth' ? option.price_per_lesson_youth_cents : option.price_per_lesson_adult_cents;
}

export function assertPositiveYearlyCents(yearlyCents: number): void {
	if (yearlyCents <= 0) throw new Error('Geen lessen in dit schooljaar; geen betaling aangemaakt.');
}

export function assertHasBillingPhases(phaseCount: number): void {
	if (phaseCount === 0) throw new Error('Geen betaalmaanden te plannen.');
}

export function isTerminalScheduleStatus(status: string): boolean {
	return status === 'canceled' || status === 'completed' || status === 'released';
}

export function resolveStripeSubscriptionId(subscription: string | { id?: string } | null | undefined): string | null {
	if (typeof subscription === 'string') return subscription;
	return subscription?.id ?? null;
}

export interface BillingComputationAgreement {
	id: string;
	student_user_id: string;
	lesson_type_id: string;
	frequency: LessonFrequency;
	duration_minutes: number;
	day_of_week: number;
	start_date: string;
	end_date: string | null;
}

export interface BillingComputation {
	agreement: BillingComputationAgreement;
	yearly: YearlyResult;
	tariff: AgeTariff;
	pricePerLessonCents: number;
	periodStart: string;
	periodEnd: string;
	schoolYear: SchoolYearWindow;
}

export function buildBillingComputationFromLoadedData(input: {
	agreement: BillingComputationAgreement & { is_active: boolean };
	option: {
		price_per_lesson_youth_cents: number | null;
		price_per_lesson_adult_cents: number | null;
	};
	dateOfBirth: string | null;
	noLessonPeriods: ReadonlyArray<NoLessonPeriod>;
	today: string;
	schoolYearBounds?: SchoolYearBounds;
	ageThresholdYears?: number;
}): BillingComputation {
	if (!input.agreement.is_active) throw new Error('Lesovereenkomst is niet actief');

	const bounds = input.schoolYearBounds ?? DEFAULT_SCHOOL_YEAR_BOUNDS;
	const ref = resolveBillingReferenceDate(input.agreement.start_date, input.today);
	const schoolYear = getSchoolYearForDateString(ref, bounds);
	const window = clampToSchoolYear(schoolYear, input.agreement.start_date, input.agreement.end_date);
	if (!window) throw new Error('Geen lesperiode binnen het huidige schooljaar.');

	const tariff = pickAgeTariff(input.dateOfBirth, window.start, input.ageThresholdYears);
	const pricePerLessonCents = pickPriceCentsForTariff(input.option, tariff);
	if (!pricePerLessonCents || pricePerLessonCents <= 0) {
		throw new Error(`Geen prijs ingesteld voor tarief ${tariff}.`);
	}

	const yearly = calculateYearly({
		periodStart: window.start,
		periodEnd: window.end,
		dayOfWeek: input.agreement.day_of_week,
		frequency: input.agreement.frequency,
		pricePerLessonCents,
		noLessonPeriods: input.noLessonPeriods,
		schoolYearBounds: bounds,
	});

	return {
		agreement: {
			id: input.agreement.id,
			student_user_id: input.agreement.student_user_id,
			lesson_type_id: input.agreement.lesson_type_id,
			frequency: input.agreement.frequency,
			duration_minutes: input.agreement.duration_minutes,
			day_of_week: input.agreement.day_of_week,
			start_date: input.agreement.start_date,
			end_date: input.agreement.end_date,
		},
		yearly,
		tariff,
		pricePerLessonCents,
		periodStart: window.start,
		periodEnd: window.end,
		schoolYear,
	};
}
