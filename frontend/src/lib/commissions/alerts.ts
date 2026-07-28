import { DEMO_AS_OF_DATE } from "./constants";
import { outstandingForRecord } from "./calculations";
import type {
  CommissionAlert,
  CommissionAlertType,
  DemoCommissionRecord,
} from "./types";

type AlertRule = {
  type: CommissionAlertType;
  title: string;
  test: (record: DemoCommissionRecord) => boolean;
  detail: (record: DemoCommissionRecord) => string;
};

const RULES: AlertRule[] = [
  {
    type: "overdue_commission",
    title: "Overdue commission",
    test: (record) => record.status === "Overdue",
    detail: (record) =>
      `${record.customer} — ${record.supplier}: demo overdue balance ${formatAlertGbp(outstandingForRecord(record))}.`,
  },
  {
    type: "missing_payment",
    title: "Missing payment",
    test: (record) =>
      record.status === "Invoiced" &&
      record.paidAmountGbp === 0 &&
      record.expectedPaymentDate !== null &&
      record.expectedPaymentDate < DEMO_AS_OF_DATE,
    detail: (record) =>
      `${record.customer}: expected payment date passed with no demo payment recorded.`,
  },
  {
    type: "underpayment",
    title: "Underpayment",
    test: (record) =>
      record.status === "Part Paid" &&
      outstandingForRecord(record) > 0 &&
      record.paidAmountGbp > 0,
    detail: (record) =>
      `${record.customer}: demo paid ${formatAlertGbp(record.paidAmountGbp)} vs expected ${formatAlertGbp(record.expectedAmountGbp)}.`,
  },
  {
    type: "contract_ended",
    title: "Contract ended",
    test: (record) =>
      record.contractEnd < DEMO_AS_OF_DATE &&
      record.status !== "Paid" &&
      record.status !== "Cancelled",
    detail: (record) =>
      `${record.customer} / ${record.site}: contract ended ${record.contractEnd} with open demo commission.`,
  },
  {
    type: "supplier_dispute",
    title: "Supplier dispute",
    test: (record) => record.status === "Disputed",
    detail: (record) =>
      `${record.supplier} — ${record.customer}: demo dispute on commission record ${record.id}.`,
  },
  {
    type: "reconciliation_required",
    title: "Reconciliation required",
    test: (record) =>
      record.paidAmountGbp > record.expectedAmountGbp ||
      (record.status === "Paid" &&
        record.paidAmountGbp < record.expectedAmountGbp),
    detail: (record) =>
      `${record.customer}: demo paid vs expected mismatch — reconcile before closing.`,
  },
];

function formatAlertGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildCommissionAlerts(
  records: DemoCommissionRecord[],
): CommissionAlert[] {
  const alerts: CommissionAlert[] = [];

  for (const record of records) {
    for (const rule of RULES) {
      if (rule.test(record)) {
        alerts.push({
          id: `${record.id}-${rule.type}`,
          type: rule.type,
          title: rule.title,
          detail: rule.detail(record),
          recordId: record.id,
        });
      }
    }
  }

  return alerts;
}

export function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDisplayDate(date: string | null): string {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
