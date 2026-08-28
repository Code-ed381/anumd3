export function moneyToNumber(value: { toString(): string } | number | string) {
  return Number(value);
}

export function formatGhs(value: { toString(): string } | number | string) {
  return `GHS ${moneyToNumber(value).toFixed(2)}`;
}
