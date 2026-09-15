import { XMLParser } from 'npm:fast-xml-parser@4.5.0';
import { buildParsedReportFromDoc } from './parsePain002Pure.ts';
import type { ParsedReport } from './types.ts';

export function parsePain002(xml: string): ParsedReport {
	const parser = new XMLParser({
		ignoreAttributes: true,
		removeNSPrefix: true,
		parseTagValue: false,
		trimValues: true,
	});
	const doc = parser.parse(xml) as Record<string, unknown>;
	return buildParsedReportFromDoc(doc);
}
