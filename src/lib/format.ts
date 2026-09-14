/** Prices are Iraqi dinar. No decimals — nobody writes 35,000.00 IQD. */
export function formatPrice(value: number): string {
  return `${value.toLocaleString("en-US")} IQD`;
}
