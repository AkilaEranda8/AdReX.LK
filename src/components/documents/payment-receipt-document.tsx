"use client";

import { companyInfo } from "@/lib/company";
import {
  formatReceiptAmount,
  formatReceiptDate,
  getReceiptTotals,
  getInvoiceReceiptTotals,
  mapReceiptItems,
  type ReceiptDocumentProps,
  type InvoiceReceiptTotals,
} from "@/lib/receipt-document";
import { cn } from "@/lib/utils";

const metaGrid =
  "inline-grid w-fit grid-cols-[8.5rem_10.5rem] overflow-hidden rounded-sm border border-gray-300 text-[9pt]";
const totalsGrid =
  "inline-grid w-fit grid-cols-[11.5rem_7rem] overflow-hidden rounded-sm border border-gray-300 text-[9pt]";
const metaLabel =
  "flex min-h-[2rem] items-center whitespace-nowrap bg-black px-3 py-2 text-[8.5pt] font-bold leading-tight text-white";
const metaLabelRow = "border-b border-gray-300";
const metaValue =
  "flex min-h-[2rem] items-center justify-end whitespace-nowrap bg-gray-200 px-3 py-2 text-right font-medium leading-tight text-black tabular-nums";
const metaValueRow = "border-b border-gray-300";
const tableBorder = "border border-gray-300";
const rowBg = "bg-gray-50";

export function PaymentReceiptDocument({
  title = "INVOICE",
  documentNumber,
  documentDate,
  clientName,
  items,
  subTotal,
  discount = 0,
  taxRate = 0,
  grandTotal,
  advance = 0,
  balanceDue,
  className,
  dateLabel = "Invoice Date",
  numberLabel = "Invoice No",
  showPaymentInfo = true,
}: ReceiptDocumentProps) {
  const rows = mapReceiptItems(items);
  const totals: InvoiceReceiptTotals =
    taxRate > 0 && grandTotal != null
      ? getInvoiceReceiptTotals({
          subTotal,
          discount,
          taxRate,
          grandTotal,
          advancePayment: advance,
          remainingBalance: balanceDue,
        })
      : (() => {
          const base = getReceiptTotals(subTotal, discount, advance, balanceDue);
          return {
            subTotal: base.subTotal,
            discount: base.discount,
            taxRate: 0,
            taxAmount: 0,
            grandTotal: grandTotal ?? base.subTotalLessDiscount,
            subTotalLessDiscount: base.subTotalLessDiscount,
            advance: base.advance,
            balanceDue: base.balanceDue,
          };
        })();
  const minRows = Math.max(rows.length < 4 ? 4 - rows.length : 0, 8 - rows.length);

  return (
    <div
      className={cn(
        "invoice-document mx-auto w-full max-w-[210mm] rounded-lg border border-gray-200 bg-white p-6 text-black shadow-md sm:p-8",
        "print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b-2 border-black pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[22pt] font-black leading-none tracking-tight sm:text-[22pt]">{companyInfo.brand}</p>
          <p className="mt-1 text-[8pt] font-bold uppercase tracking-[0.18em] text-gray-600">
            {companyInfo.tagline}
          </p>
          <p className="mt-0.5 text-[9pt] text-gray-600">{companyInfo.website}</p>
        </div>
        <div className="text-left text-[9pt] leading-relaxed text-black sm:text-right">
          <p className="text-[10pt] font-bold">{companyInfo.name}</p>
          <p className="mt-1 text-gray-700">{companyInfo.phones.join(" | ")}</p>
          {companyInfo.emails.map((email) => (
            <p key={email} className="text-gray-700">
              {email}
            </p>
          ))}
        </div>
      </div>

      <h2 className="py-4 text-center text-[13pt] font-bold tracking-wide">{title}</h2>

      {/* Client + meta */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <p className="text-[10pt]">
          <span className="font-bold">Client :</span>{" "}
          <span className="inline-block min-w-0 border-b border-gray-500 pb-0.5 font-medium sm:min-w-[180px]">
            {clientName}
          </span>
        </p>
        <div className={metaGrid}>
          <div className={cn(metaLabel, metaLabelRow)}>{dateLabel}</div>
          <div className={cn(metaValue, metaValueRow)}>{formatReceiptDate(documentDate)}</div>
          <div className={metaLabel}>{numberLabel}</div>
          <div className={metaValue}>{documentNumber}</div>
        </div>
      </div>

      {/* Items table */}
      <div className="overflow-x-touch -mx-2 px-2 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[480px] border-collapse text-[9pt] text-black">
        <thead>
          <tr className="bg-black text-white">
            <th className={cn("w-10 px-1 py-2 text-center text-[8.5pt] font-bold", tableBorder, "border-black")}>
              NO
            </th>
            <th className={cn("w-[88px] px-2 py-2 text-left text-[8.5pt] font-bold", tableBorder, "border-black")}>
              ITEM
            </th>
            <th className={cn("px-2 py-2 text-left text-[8.5pt] font-bold", tableBorder, "border-black")}>
              DESCRIPTION
            </th>
            <th className={cn("w-14 px-1 py-2 text-center text-[8.5pt] font-bold", tableBorder, "border-black")}>
              QTY.
            </th>
            <th className={cn("w-[72px] px-2 py-2 text-right text-[8.5pt] font-bold", tableBorder, "border-black")}>
              RATE
            </th>
            <th className={cn("w-[76px] px-2 py-2 text-right text-[8.5pt] font-bold", tableBorder, "border-black")}>
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.no} className={rowBg}>
              <td className={cn("px-1 py-2.5 text-center align-top", tableBorder)}>{row.no}</td>
              <td className={cn("px-2 py-2.5 align-top leading-snug", tableBorder)}>{row.item}</td>
              <td className={cn("px-2 py-2.5 align-top leading-snug", tableBorder)}>{row.description}</td>
              <td className={cn("px-1 py-2.5 text-center align-top", tableBorder)}>{row.qty}</td>
              <td className={cn("px-2 py-2.5 text-right align-top tabular-nums", tableBorder)}>
                {formatReceiptAmount(row.rate)}
              </td>
              <td className={cn("px-2 py-2.5 text-right align-top font-medium tabular-nums", tableBorder)}>
                {formatReceiptAmount(row.total)}
              </td>
            </tr>
          ))}
          {Array.from({ length: minRows }).map((_, i) => (
            <tr key={`empty-${i}`} className={rowBg}>
              <td className={cn("px-1 py-3", tableBorder)}>&nbsp;</td>
              <td className={cn("px-2 py-3", tableBorder)} />
              <td className={cn("px-2 py-3", tableBorder)} />
              <td className={cn("px-1 py-3", tableBorder)} />
              <td className={cn("px-2 py-3", tableBorder)} />
              <td className={cn("px-2 py-3", tableBorder)} />
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Bottom section */}
      <div className="invoice-bottom mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="text-[9pt] leading-relaxed text-black">
          {showPaymentInfo && (
            <>
              <p className="mb-2 text-[10pt] font-bold">Payment Information</p>
              {companyInfo.banks.map((bank) => (
                <div key={bank.name} className="mb-3">
                  <p className="font-bold">{bank.name}</p>
                  <p className="text-gray-700">Acc No : {bank.accountNo}</p>
                  <p className="text-gray-700">Branch : {bank.branch}</p>
                  <p className="text-gray-700">Name : {bank.accountName}</p>
                </div>
              ))}
            </>
          )}
          <p className={cn("text-[10pt] font-bold", showPaymentInfo && "mt-2")}>Remarks:</p>
          <p className="mt-1 text-[8.5pt] leading-relaxed text-gray-600">- {companyInfo.remarks}</p>
        </div>

        <div className="flex flex-col items-end text-[9pt] text-black">
          <div className="w-fit">
            {[
              { label: "Sub Total", value: totals.subTotal, show: true },
              { label: "Discount", value: totals.discount, show: totals.discount > 0 },
              {
                label: `Tax (${totals.taxRate}%)`,
                value: totals.taxAmount,
                show: totals.taxAmount > 0,
              },
              {
                label: totals.taxAmount > 0 ? "Total" : "Sub Total less Discount",
                value: totals.taxAmount > 0 ? totals.grandTotal : totals.subTotalLessDiscount,
                show: true,
              },
              { label: "Advance", value: totals.advance, show: totals.advance > 0 },
            ]
              .filter((row) => row.show)
              .map((row) => (
              <div key={row.label} className="grid grid-cols-[11.5rem_7rem] items-center py-1">
                <span className="whitespace-nowrap pr-2 text-right text-gray-700">{row.label}</span>
                <span className="whitespace-nowrap text-right font-medium tabular-nums">
                  {formatReceiptAmount(row.value)}
                </span>
              </div>
            ))}
            <div className={cn(totalsGrid, "mt-1.5")}>
              <div className={metaLabel}>Balance Due (LKR)</div>
              <div className={cn(metaValue, "text-[10pt] font-bold tabular-nums")}>
                {formatReceiptAmount(totals.balanceDue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="mt-10 flex justify-end">
        <div className="text-center text-[9pt] text-black">
          <div className="mb-2 w-44 border-b-2 border-dotted border-gray-600 pb-10" />
          <p className="font-bold">Authorised Sign</p>
        </div>
      </div>

      {/* Footer */}
      <div className="invoice-footer mt-8 border-t-2 border-black pt-3">
        <div className="flex items-end justify-between gap-4">
          <p className="flex-1 text-center text-[8pt] text-gray-600">{companyInfo.copyright}</p>
          <p className="text-[11pt] font-black">{companyInfo.brand}</p>
        </div>
      </div>
    </div>
  );
}
