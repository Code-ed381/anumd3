const LABELS: Record<string, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  PAID: "bg-sky-100 text-sky-900",
  CONFIRMED: "bg-indigo-100 text-indigo-900",
  READY: "bg-emerald-100 text-emerald-900",
  COMPLETED: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? "bg-stone-100 text-stone-700"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
