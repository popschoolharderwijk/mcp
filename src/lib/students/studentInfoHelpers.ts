/** Formats a Dutch mobile number as 06 1234 5678 when length is 10. */
export function formatPhoneNumber(phone: string | null): string {
	if (!phone) return '-';
	if (phone.length === 10) {
		return `${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`;
	}
	return phone;
}

export function hasParentContactInfo(
	parentName: string | null,
	parentEmail: string | null,
	parentPhoneNumber: string | null,
): boolean {
	return !!(parentName || parentEmail || parentPhoneNumber);
}
