export function resolveSchoolYearStartAndEndYear(
	calendarYear: number,
	asOf: number,
	startOrd: number,
	endOrd: number,
): { startYear: number; endYear: number } {
	let startYear: number;
	if (startOrd <= endOrd) {
		startYear = asOf >= startOrd && asOf <= endOrd ? calendarYear : asOf > endOrd ? calendarYear : calendarYear - 1;
	} else if (asOf >= startOrd) {
		startYear = calendarYear;
	} else if (asOf <= endOrd) {
		startYear = calendarYear - 1;
	} else {
		startYear = calendarYear;
	}

	const endYear = startOrd <= endOrd ? startYear : startYear + 1;
	return { startYear, endYear };
}
