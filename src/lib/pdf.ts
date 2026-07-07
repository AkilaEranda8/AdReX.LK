import { jsPDF } from "jspdf";
import { companyInfo } from "@/lib/company";
import type { PdfCompanyInfo } from "@/lib/pdf-settings";
import {
  formatReceiptAmount,
  formatReceiptDate,
  getReceiptTotals,
  getInvoiceReceiptTotals,
  getInvoiceDocumentTitle,
  getInvoiceDocumentMeta,
  mapReceiptItems,
  type InvoiceReceiptTotals,
  type ReceiptLineItem,
} from "@/lib/receipt-document";

export interface DocumentData {
  type: "invoice" | "quotation";
  number: string;
  date: string | Date;
  client: { name: string; clientId?: string; contactNumber?: string; email?: string };
  items: ReceiptLineItem[];
  subTotal?: number;
  discount?: number;
  taxRate?: number;
  advancePayment?: number;
  grandTotal: number;
  remainingBalance?: number;
  company?: PdfCompanyInfo;
  documentTitle?: string;
  invoiceStatus?: string;
  paymentStatus?: string;
  /** @deprecated use invoiceStatus / paymentStatus */
  status?: string;
}

const TITLE_MAP = {
  invoice: "INVOICE",
  quotation: "QUOTATION",
};

const LAYOUT = {
  pageW: 210,
  pageH: 297,
  margin: 14,
  footerY: 286,
  minTableRows: 2,
  emptyRowH: 9,
  colX: [14, 24, 54, 134, 152, 172] as const,
  colW: [10, 30, 80, 18, 20, 24] as const,
  totalsLabelW: 58,
  totalsValueW: 32,
  metaLabelW: 36,
  metaValueW: 46,
  font: {
    brand: 22,
    tagline: 8.5,
    contact: 10,
    title: 15,
    section: 11,
    body: 10.5,
    tableHead: 10,
    tableBody: 10.5,
    small: 9,
    footer: 9,
  },
};

/** Vertical scale applied so the full document fits one A4 page */
let activeScale = 1;
const sc = (n: number, min = 0) => Math.max(min, n * activeScale);
/** Fonts stay larger when layout compresses to fit one page */
const scFont = (n: number) => Math.max(8.5, n * Math.max(activeScale, 0.92));

type MappedRow = ReturnType<typeof mapReceiptItems>[number];

interface PdfBuildContext {
  doc: jsPDF;
  company: PdfCompanyInfo;
  data: DocumentData;
  title: string;
  meta: { dateLabel: string; numberLabel: string };
  totals: InvoiceReceiptTotals;
}

function setColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function getTotalsLayout() {
  const { pageW, margin, totalsLabelW, totalsValueW } = LAYOUT;
  const blockW = totalsLabelW + totalsValueW;
  const rightX = pageW - margin;
  const valueX = rightX - totalsValueW;
  const labelX = valueX - totalsLabelW;
  return { blockW, rightX, valueX, labelX, labelW: totalsLabelW, valueW: totalsValueW };
}

function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  valueW: number
) {
  const h = sc(6.5, 5);
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, labelW, h, "F");
  setColor(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  let labelFont = scFont(LAYOUT.font.small);
  doc.setFontSize(labelFont);
  while (doc.getTextWidth(label) > labelW - 4 && labelFont > 7) {
    labelFont -= 0.5;
    doc.setFontSize(labelFont);
  }
  doc.text(label, x + 2, y + h * 0.7);

  doc.setFillColor(235, 235, 235);
  doc.rect(x + labelW, y, valueW, h, "F");
  setColor(doc, [0, 0, 0]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.body));
  doc.text(value, x + labelW + valueW - 2, y + h * 0.7, { align: "right" });
}

function drawPageFooter(doc: jsPDF, company: PdfCompanyInfo) {
  const { margin, pageW, footerY } = LAYOUT;
  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(scFont(LAYOUT.font.footer));
  setColor(doc, [110, 110, 110]);
  doc.text(company.copyright, pageW / 2, footerY + sc(4.5, 3.5), { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.contact));
  setColor(doc, [0, 0, 0]);
  doc.text(company.brand, pageW - margin, footerY + sc(4.5, 3.5), { align: "right" });
}

function drawMainHeader(doc: jsPDF, company: PdfCompanyInfo, y: number) {
  const { margin, pageW } = LAYOUT;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.brand));
  setColor(doc, [0, 0, 0]);
  doc.text(company.brand, margin, y + sc(6, 4));

  doc.setFontSize(scFont(LAYOUT.font.tagline));
  doc.text(company.tagline, margin, y + sc(11, 8));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(scFont(LAYOUT.font.contact));
  doc.text(company.website, margin, y + sc(15.5, 11));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.section));
  doc.text(company.name, pageW - margin, y + sc(5, 4), { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(scFont(LAYOUT.font.contact));
  doc.text(company.phones.join(" | "), pageW - margin, y + sc(10, 7), { align: "right" });
  company.emails.slice(0, 2).forEach((email, i) => {
    doc.text(email, pageW - margin, y + sc(14.5, 10) + i * sc(4.5, 3.5), { align: "right" });
  });

  y += sc(22, 16);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  return y + sc(7, 5);
}

function drawDocumentTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.title));
  setColor(doc, [0, 0, 0]);
  doc.text(title, LAYOUT.pageW / 2, y, { align: "center" });
  return y + sc(9, 6);
}

function drawClientMeta(doc: jsPDF, ctx: PdfBuildContext, y: number) {
  const { margin, pageW } = LAYOUT;
  const labelH = sc(6.5, 5);
  doc.setFontSize(scFont(LAYOUT.font.body));
  doc.setFont("helvetica", "bold");
  setColor(doc, [0, 0, 0]);
  doc.text("Client :", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(scFont(LAYOUT.font.section));
  doc.text(ctx.data.client.name, margin + 16, y);

  const metaBlockW = LAYOUT.metaLabelW + LAYOUT.metaValueW;
  const metaX = pageW - margin - metaBlockW;
  drawLabelValue(
    doc,
    ctx.meta.dateLabel,
    formatReceiptDate(ctx.data.date),
    metaX,
    y - labelH * 0.7,
    LAYOUT.metaLabelW,
    LAYOUT.metaValueW
  );
  drawLabelValue(
    doc,
    ctx.meta.numberLabel,
    ctx.data.number,
    metaX,
    y + labelH * 0.45,
    LAYOUT.metaLabelW,
    LAYOUT.metaValueW
  );
  return y + sc(13, 10);
}

function drawTableHeader(doc: jsPDF, y: number) {
  const { margin, pageW, colX, colW } = LAYOUT;
  const headH = sc(8, 6);
  const headers = ["NO", "ITEM", "DESCRIPTION", "QTY.", "RATE", "TOTAL"];

  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, pageW - margin * 2, headH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.tableHead));
  setColor(doc, [255, 255, 255]);

  headers.forEach((h, i) => {
    const align = i >= 4 ? "right" : i === 0 || i === 3 ? "center" : "left";
    const tx =
      align === "right"
        ? colX[i] + colW[i] - 1.5
        : align === "center"
          ? colX[i] + colW[i] / 2
          : colX[i] + 1.5;
    doc.text(h, tx, y + headH * 0.68, { align: align as "left" | "center" | "right" });
  });

  return y + headH;
}

function getRowHeight(doc: jsPDF, row: MappedRow) {
  const descW = LAYOUT.colW[2] - 3;
  const itemW = LAYOUT.colW[1] - 3;
  doc.setFontSize(scFont(LAYOUT.font.tableBody));

  const descLines = row.description
    ? doc.splitTextToSize(row.description, descW)
    : [""];
  const itemLines = row.item ? doc.splitTextToSize(row.item, itemW) : [""];
  const lineCount = Math.max(descLines.length, itemLines.length, 1);
  const lineH = sc(4.8, 3.8);
  return Math.max(sc(9, 6.5), sc(4.5, 3.5) + lineCount * lineH);
}

function getEmptyRowHeight() {
  return sc(LAYOUT.emptyRowH, 6.5);
}

function drawTableRow(doc: jsPDF, row: MappedRow, y: number) {
  const { margin, pageW, colX, colW } = LAYOUT;
  const rowH = getRowHeight(doc, row);

  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, pageW - margin * 2, rowH, "F");
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.1);
  doc.rect(margin, y, pageW - margin * 2, rowH, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(scFont(LAYOUT.font.tableBody));
  setColor(doc, [0, 0, 0]);

  const descW = colW[2] - 3;
  const itemW = colW[1] - 3;
  const lineH = sc(4.8, 3.8);
  const textY = sc(5, 3.5);
  const descLines = row.description ? doc.splitTextToSize(row.description, descW) : [];
  const itemLines = row.item ? doc.splitTextToSize(row.item, itemW) : [];

  // NO
  doc.text(String(row.no), colX[0] + colW[0] / 2, y + textY, { align: "center" });
  // ITEM
  itemLines.forEach((line: string, i: number) => {
    doc.text(line, colX[1] + 1.5, y + textY + i * lineH);
  });
  // DESCRIPTION
  descLines.forEach((line: string, i: number) => {
    doc.text(line, colX[2] + 1.5, y + textY + i * lineH);
  });
  // QTY
  if (row.qty) doc.text(String(row.qty), colX[3] + colW[3] / 2, y + textY, { align: "center" });
  // RATE
  if (row.rate) doc.text(formatReceiptAmount(row.rate), colX[4] + colW[4] - 1.5, y + textY, { align: "right" });
  // TOTAL
  if (row.total) doc.text(formatReceiptAmount(row.total), colX[5] + colW[5] - 1.5, y + textY, { align: "right" });

  return y + rowH;
}

function estimateBottomBlockHeight(doc: jsPDF, company: PdfCompanyInfo, isQuotation = false) {
  doc.setFontSize(scFont(LAYOUT.font.small));
  const remarkLines = doc.splitTextToSize(`- ${company.remarks}`, 86);
  const bankH = sc(18.5, 13);
  const bankSectionH = isQuotation ? 0 : sc(6, 4) + company.banks.length * bankH;
  const leftH =
    sc(4, 3) +
    (isQuotation ? 0 : sc(6, 4)) +
    bankSectionH +
    sc(5, 3.5) +
    remarkLines.length * sc(4, 3);
  const rightH = sc(4, 3) + sc(5.5, 4) * 4 + sc(1.5, 1) + sc(8, 6) + sc(8, 6);
  return Math.max(leftH, rightH);
}

function estimateSignatureBlockHeight() {
  return sc(14, 10);
}

function estimateTopSectionHeight() {
  return sc(29, 21) + sc(7, 5) + sc(9, 6) + sc(13, 10) + sc(8, 6);
}

function estimateTableBodyHeight(doc: jsPDF, rows: MappedRow[]) {
  return rows.reduce((sum, row) => {
    if (row.item || row.description) return sum + getRowHeight(doc, row);
    return sum + getEmptyRowHeight();
  }, 0);
}

function getReservedBottomHeight(doc: jsPDF, company: PdfCompanyInfo, isQuotation = false) {
  return estimateBottomBlockHeight(doc, company, isQuotation) + estimateSignatureBlockHeight() + sc(10, 7);
}

function getBottomSectionY(company: PdfCompanyInfo, doc: jsPDF, isQuotation = false) {
  return LAYOUT.footerY - getReservedBottomHeight(doc, company, isQuotation);
}

function resolveActiveScale(doc: jsPDF, rows: MappedRow[], company: PdfCompanyInfo, isQuotation = false) {
  const minScale = 0.68;
  let scale = 1;

  while (scale >= minScale) {
    activeScale = scale;
    const topH = estimateTopSectionHeight();
    const tableH = estimateTableBodyHeight(doc, rows);
    const reservedBottom = getReservedBottomHeight(doc, company, isQuotation);
    const totalH = LAYOUT.margin + topH + tableH + reservedBottom;

    if (totalH <= LAYOUT.footerY + 1) return scale;

    scale = Math.round((scale - 0.03) * 100) / 100;
  }

  return minScale;
}

function drawDottedLine(doc: jsPDF, x1: number, y: number, x2: number, gap = 1.6) {
  doc.setFillColor(0, 0, 0);
  for (let x = x1; x <= x2; x += gap) {
    doc.circle(x, y, 0.25, "F");
  }
}

function drawEmptyTableRow(doc: jsPDF, rowNo: number, y: number) {
  const { margin, pageW } = LAYOUT;
  const rowH = getEmptyRowHeight();
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, pageW - margin * 2, rowH, "F");
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.1);
  doc.rect(margin, y, pageW - margin * 2, rowH, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(scFont(LAYOUT.font.tableBody));
  setColor(doc, [0, 0, 0]);
  doc.text(String(rowNo), LAYOUT.colX[0] + LAYOUT.colW[0] / 2, y + sc(5, 3.5), { align: "center" });
  return y + rowH;
}

function fillTableRows(doc: jsPDF, y: number, rows: MappedRow[], maxTableY: number) {
  const rowH = getEmptyRowHeight();
  let rowNo = rows.length;
  while (y + rowH <= maxTableY + 0.5) {
    rowNo += 1;
    y = drawEmptyTableRow(doc, rowNo, y);
  }
  return y;
}

function drawBottomSection(doc: jsPDF, ctx: PdfBuildContext, y: number, footerLineY: number) {
  const { margin, pageW } = LAYOUT;
  const { company, totals } = ctx;
  const isQuotation = ctx.data.type === "quotation";
  const leftX = margin;
  const lineGap = sc(4, 3);
  const bankGap = sc(6, 4);

  let leftY = y + sc(4, 3);
  let rightY = y + sc(4, 3);

  if (!isQuotation) {
    doc.setFontSize(scFont(LAYOUT.font.section));
    doc.setFont("helvetica", "bold");
    setColor(doc, [0, 0, 0]);
    doc.text("Payment Information", leftX, leftY);
    leftY += sc(6, 4);

    doc.setFontSize(scFont(LAYOUT.font.body));
    company.banks.forEach((bank) => {
      doc.setFont("helvetica", "bold");
      doc.text(bank.name, leftX, leftY);
      leftY += sc(4.5, 3.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Acc No : ${bank.accountNo}`, leftX, leftY);
      leftY += lineGap;
      doc.text(`Branch : ${bank.branch}`, leftX, leftY);
      leftY += lineGap;
      doc.text(`Name : ${bank.accountName}`, leftX, leftY);
      leftY += bankGap;
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.section));
  setColor(doc, [0, 0, 0]);
  doc.text("Remarks:", leftX, leftY);
  leftY += sc(5, 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(scFont(LAYOUT.font.small));
  const remarkLines = doc.splitTextToSize(`- ${company.remarks}`, 86);
  remarkLines.forEach((line: string) => {
    doc.text(line, leftX, leftY);
    leftY += lineGap;
  });

  const totalRows = [
    { label: "Sub Total", value: totals.subTotal, show: true },
    { label: "Discount", value: totals.discount, show: totals.discount > 0 },
    { label: `Tax (${totals.taxRate}%)`, value: totals.taxAmount, show: totals.taxAmount > 0 },
    {
      label: totals.taxAmount > 0 ? "Total" : "Sub Total less Discount",
      value: totals.taxAmount > 0 ? totals.grandTotal : totals.subTotalLessDiscount,
      show: true,
    },
    { label: "Advance", value: totals.advance, show: totals.advance > 0 },
  ].filter((row) => row.show);

  const { rightX, valueX, labelX, labelW, valueW } = getTotalsLayout();

  doc.setFontSize(scFont(LAYOUT.font.body));
  totalRows.forEach((row) => {
    doc.setFont("helvetica", "normal");
    setColor(doc, [0, 0, 0]);
    doc.text(row.label, valueX - 2, rightY, { align: "right" });
    doc.text(formatReceiptAmount(row.value), rightX, rightY, { align: "right" });
    rightY += sc(5.5, 4);
  });

  rightY += sc(1.5, 1);
  drawLabelValue(
    doc,
    "Balance Due (LKR)",
    formatReceiptAmount(totals.balanceDue),
    labelX,
    rightY,
    labelW,
    valueW
  );

  const signLineW = 50;
  const signX = pageW - margin - signLineW;
  const signCenterX = signX + signLineW / 2;
  const signY = footerLineY - estimateSignatureBlockHeight();
  const dotY = signY + sc(4, 3);
  drawDottedLine(doc, signX, dotY, pageW - margin);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(scFont(LAYOUT.font.body));
  setColor(doc, [0, 0, 0]);
  doc.text("Authorised Sign", signCenterX, dotY + sc(6, 5), { align: "center" });
}

export function generatePDF(data: DocumentData): jsPDF {
  activeScale = 1;
  const company = data.company ?? companyInfo;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const subTotal = data.subTotal ?? data.items.reduce((s, i) => s + i.total, 0);
  const advance = data.advancePayment ?? 0;
  const balanceDue = data.remainingBalance ?? data.grandTotal;
  const totals: InvoiceReceiptTotals =
    data.type === "invoice" && data.grandTotal != null
      ? getInvoiceReceiptTotals({
          subTotal,
          discount: data.discount ?? 0,
          taxRate: data.taxRate ?? 0,
          grandTotal: data.grandTotal,
          advancePayment: advance,
          remainingBalance: balanceDue,
        })
      : (() => {
          const base = getReceiptTotals(subTotal, Math.abs(data.discount ?? 0), advance, balanceDue);
          return {
            subTotal: base.subTotal,
            discount: base.discount,
            taxRate: 0,
            taxAmount: 0,
            grandTotal: data.grandTotal,
            subTotalLessDiscount: base.subTotalLessDiscount,
            advance: base.advance,
            balanceDue: base.balanceDue,
          };
        })();
  const title =
    data.documentTitle ??
    (data.type === "invoice"
      ? getInvoiceDocumentTitle(balanceDue, data.invoiceStatus ?? data.status, data.paymentStatus)
      : TITLE_MAP[data.type]);
  const meta =
    data.type === "invoice"
      ? getInvoiceDocumentMeta(balanceDue, data.invoiceStatus ?? data.status, data.paymentStatus)
      : { dateLabel: "Quotation Date", numberLabel: "Quotation No" };
  const rows = mapReceiptItems(data.items);

  const ctx: PdfBuildContext = { doc, company, data, title, meta, totals };

  const displayRows: MappedRow[] = [...rows];
  while (displayRows.length < LAYOUT.minTableRows) {
    displayRows.push({
      no: displayRows.length + 1,
      item: "",
      description: "",
      qty: 0,
      rate: 0,
      total: 0,
    });
  }

  activeScale = resolveActiveScale(doc, displayRows, company, data.type === "quotation");

  const footerLineY = LAYOUT.footerY;
  const bottomSectionY = getBottomSectionY(company, doc, data.type === "quotation");
  const maxTableY = bottomSectionY - sc(4, 3);

  let y = LAYOUT.margin;
  y = drawMainHeader(doc, company, y);
  y = drawDocumentTitle(doc, title, y);
  y = drawClientMeta(doc, ctx, y);
  y = drawTableHeader(doc, y);

  for (const row of displayRows) {
    y =
      row.item || row.description
        ? drawTableRow(doc, row, y)
        : drawEmptyTableRow(doc, row.no, y);
  }

  y = fillTableRows(doc, y, displayRows, maxTableY);
  drawBottomSection(doc, ctx, bottomSectionY, footerLineY);
  drawPageFooter(doc, company);

  return doc;
}

export function downloadPDF(data: DocumentData) {
  const doc = generatePDF(data);
  doc.save(`${data.number}.pdf`);
}

export function printPDF(data: DocumentData) {
  const doc = generatePDF(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
