declare module 'pdf-parse/lib/pdf-parse.js' {
	interface PdfResult {
		text: string;
		numpages: number;
		info: any;
	}
	const pdfParse: (data: Buffer | Uint8Array) => Promise<PdfResult>;
	export default pdfParse;
}
