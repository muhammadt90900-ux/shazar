import { formatPrice } from "@/lib/format";

export function Price({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatPrice(value)}</span>;
}
