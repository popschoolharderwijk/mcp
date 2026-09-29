import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';
import {
	buildCompanyBlockLines,
	buildPdfPaymentNoteText,
	PDF_BLACK_RGB,
	PDF_GRAY_TEXT_RGB,
	PDF_ORANGE_RGB,
	PDF_WHITE_RGB,
	resolveBillToCityLine,
	resolveBillToEmail,
	resolveBillToName,
	shouldUseDebtorBillTo,
} from './buildPdfPure.ts';
import { fmtDateNL, fmtEUR, wrap } from './format.ts';
import type { InvoiceLine, InvoiceTotals, StudentInfo } from './types.ts';

const ORANGE = rgb(PDF_ORANGE_RGB.red, PDF_ORANGE_RGB.green, PDF_ORANGE_RGB.blue);
const GRAY_TEXT = rgb(PDF_GRAY_TEXT_RGB.red, PDF_GRAY_TEXT_RGB.green, PDF_GRAY_TEXT_RGB.blue);
const BLACK = rgb(PDF_BLACK_RGB.red, PDF_BLACK_RGB.green, PDF_BLACK_RGB.blue);
const WHITE = rgb(PDF_WHITE_RGB.red, PDF_WHITE_RGB.green, PDF_WHITE_RGB.blue);

interface PdfFonts {
	font: PDFFont;
	bold: PDFFont;
}

interface PdfLayout {
	page: PDFPage;
	width: number;
	margin: number;
	fonts: PdfFonts;
}

function drawHeader(layout: PdfLayout, companyName: string): void {
	const { page, width, margin, fonts } = layout;
	page.drawRectangle({ x: 0, y: 791, width, height: 50, color: ORANGE });
	page.drawText(companyName, { x: margin, y: 808, size: 20, font: fonts.bold, color: WHITE });
	page.drawText('FACTUUR', { x: width - margin - 90, y: 808, size: 20, font: fonts.bold, color: WHITE });
}

function drawCompanyBlock(layout: PdfLayout, settings: Record<string, unknown>): number {
	const { page, margin, fonts } = layout;
	let y = 760;
	for (const line of buildCompanyBlockLines(settings)) {
		page.drawText(line, { x: margin, y, size: 9, font: fonts.font, color: GRAY_TEXT });
		y -= 12;
	}
	return y;
}

function drawInvoiceMeta(
	layout: PdfLayout,
	invoiceNumber: string,
	issueDate: string,
	dueDate: string,
	periodStart: string | null,
	periodEnd: string | null,
): void {
	const { page, width, margin, fonts } = layout;
	const metaX = width - margin - 200;
	let metaY = 760;
	const meta: Array<[string, string]> = [
		['Factuurnummer', invoiceNumber],
		['Factuurdatum', fmtDateNL(issueDate)],
		['Vervaldatum', fmtDateNL(dueDate)],
	];
	if (periodStart && periodEnd) {
		meta.push(['Periode', `${fmtDateNL(periodStart)} – ${fmtDateNL(periodEnd)}`]);
	}
	for (const [label, value] of meta) {
		page.drawText(`${label}:`, { x: metaX, y: metaY, size: 9, font: fonts.bold, color: BLACK });
		page.drawText(value, { x: metaX + 90, y: metaY, size: 9, font: fonts.font, color: BLACK });
		metaY -= 13;
	}
}

function drawBillTo(layout: PdfLayout, student: StudentInfo): void {
	const { page, margin, fonts } = layout;
	let y = 660;
	page.drawText('Factuuradres', { x: margin, y, size: 10, font: fonts.bold, color: ORANGE });
	y -= 14;

	const useDebtor = shouldUseDebtorBillTo(student);
	page.drawText(resolveBillToName(student, useDebtor), { x: margin, y, size: 11, font: fonts.bold, color: BLACK });
	y -= 13;

	if (useDebtor && student.debtor_address) {
		page.drawText(student.debtor_address, { x: margin, y, size: 10, font: fonts.font, color: BLACK });
		y -= 12;
		const cityLine = resolveBillToCityLine(student);
		if (cityLine) {
			page.drawText(cityLine, { x: margin, y, size: 10, font: fonts.font, color: BLACK });
		}
	}
	page.drawText(resolveBillToEmail(student), {
		x: margin,
		y: y - 12,
		size: 10,
		font: fonts.font,
		color: GRAY_TEXT,
	});
}

function drawLinesTable(layout: PdfLayout, lines: InvoiceLine[]): number {
	const { page, width, margin, fonts } = layout;
	let ty = 580;
	page.drawRectangle({ x: margin, y: ty - 4, width: width - 2 * margin, height: 22, color: rgb(0.96, 0.96, 0.96) });
	page.drawText('Omschrijving', { x: margin + 6, y: ty + 4, size: 9, font: fonts.bold, color: BLACK });
	page.drawText('Datum', { x: margin + 280, y: ty + 4, size: 9, font: fonts.bold, color: BLACK });
	page.drawText('Aantal', { x: margin + 350, y: ty + 4, size: 9, font: fonts.bold, color: BLACK });
	page.drawText('BTW', { x: margin + 400, y: ty + 4, size: 9, font: fonts.bold, color: BLACK });
	page.drawText('Bedrag', { x: width - margin - 60, y: ty + 4, size: 9, font: fonts.bold, color: BLACK });
	ty -= 22;

	for (const line of lines) {
		page.drawText(line.description.slice(0, 50), { x: margin + 6, y: ty, size: 9, font: fonts.font, color: BLACK });
		page.drawText(line.lesson_date ? fmtDateNL(line.lesson_date) : '—', {
			x: margin + 280,
			y: ty,
			size: 9,
			font: fonts.font,
			color: GRAY_TEXT,
		});
		page.drawText(String(line.quantity), { x: margin + 350, y: ty, size: 9, font: fonts.font, color: BLACK });
		page.drawText(line.btw_rate > 0 ? `${line.btw_rate}%` : 'vrij', {
			x: margin + 400,
			y: ty,
			size: 9,
			font: fonts.font,
			color: BLACK,
		});
		page.drawText(fmtEUR(line.amount_total_cents), {
			x: width - margin - 60,
			y: ty,
			size: 9,
			font: fonts.font,
			color: BLACK,
		});
		ty -= 16;
	}
	return ty;
}

function drawTotalsBox(layout: PdfLayout, totals: InvoiceTotals, startY: number): number {
	const { page, width, margin, fonts } = layout;
	let ty = startY - 12;
	const totalsX = width - margin - 200;
	page.drawLine({
		start: { x: totalsX, y: ty + 8 },
		end: { x: width - margin, y: ty + 8 },
		thickness: 0.5,
		color: GRAY_TEXT,
	});
	page.drawText('Subtotaal (excl. BTW)', { x: totalsX, y: ty, size: 9, font: fonts.font, color: BLACK });
	page.drawText(fmtEUR(totals.excl), { x: width - margin - 60, y: ty, size: 9, font: fonts.font, color: BLACK });
	ty -= 14;

	if (totals.btw0 > 0) {
		page.drawText('Vrijgesteld (onderwijs)', { x: totalsX, y: ty, size: 9, font: fonts.font, color: GRAY_TEXT });
		page.drawText(fmtEUR(totals.btw0), {
			x: width - margin - 60,
			y: ty,
			size: 9,
			font: fonts.font,
			color: GRAY_TEXT,
		});
		ty -= 14;
	}
	if (totals.btw21 > 0) {
		page.drawText('BTW 21%', { x: totalsX, y: ty, size: 9, font: fonts.font, color: BLACK });
		page.drawText(fmtEUR(totals.btw21), { x: width - margin - 60, y: ty, size: 9, font: fonts.font, color: BLACK });
		ty -= 14;
	}

	page.drawRectangle({ x: totalsX - 6, y: ty - 4, width: width - margin - totalsX + 6, height: 22, color: ORANGE });
	page.drawText('TOTAAL', { x: totalsX, y: ty + 4, size: 11, font: fonts.bold, color: WHITE });
	page.drawText(fmtEUR(totals.total), {
		x: width - margin - 60,
		y: ty + 4,
		size: 11,
		font: fonts.bold,
		color: WHITE,
	});
	return ty - 50;
}

function drawPaymentNote(
	layout: PdfLayout,
	settings: Record<string, unknown>,
	dueDate: string,
	mandateRef: string | null,
	startY: number,
): void {
	const { page, margin, fonts } = layout;
	const payNote = buildPdfPaymentNoteText(settings, dueDate, mandateRef, fmtDateNL);

	let ty = startY;
	for (const line of wrap(payNote, 95)) {
		page.drawText(line, { x: margin, y: ty, size: 9, font: fonts.font, color: GRAY_TEXT });
		ty -= 12;
	}
}

function drawFooter(layout: PdfLayout, settings: Record<string, unknown>): void {
	const { page, width, margin, fonts } = layout;
	if (!settings.invoice_footer_text) return;

	page.drawLine({
		start: { x: margin, y: 60 },
		end: { x: width - margin, y: 60 },
		thickness: 0.5,
		color: rgb(0.85, 0.85, 0.85),
	});
	for (const line of wrap(String(settings.invoice_footer_text), 110).slice(0, 3)) {
		page.drawText(line, { x: margin, y: 46, size: 8, font: fonts.font, color: GRAY_TEXT });
	}
}

export async function buildPdf(args: {
	settings: Record<string, unknown>;
	invoiceNumber: string;
	issueDate: string;
	dueDate: string;
	periodStart: string | null;
	periodEnd: string | null;
	student: StudentInfo;
	mandateRef: string | null;
	lines: InvoiceLine[];
	totals: InvoiceTotals;
}): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	const page = pdf.addPage([595.28, 841.89]);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
	const width = page.getWidth();
	const margin = 40;
	const layout: PdfLayout = { page, width, margin, fonts: { font, bold } };
	const companyName = String(args.settings.company_name ?? 'popschool harderwijk');

	drawHeader(layout, companyName);
	drawCompanyBlock(layout, args.settings);
	drawInvoiceMeta(layout, args.invoiceNumber, args.issueDate, args.dueDate, args.periodStart, args.periodEnd);
	drawBillTo(layout, args.student);
	const afterLinesY = drawLinesTable(layout, args.lines);
	const afterTotalsY = drawTotalsBox(layout, args.totals, afterLinesY);
	drawPaymentNote(layout, args.settings, args.dueDate, args.mandateRef, afterTotalsY);
	drawFooter(layout, args.settings);

	return await pdf.save();
}
