const WESTERN_NUMERALS_EXTENSION = "-u-nu-latn";

function withWesternNumerals(locale: string): string {
  return `${locale}${WESTERN_NUMERALS_EXTENSION}`;
}

export function formatDate(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(withWesternNumerals(locale), options).format(value);
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(withWesternNumerals(locale), options).format(value);
}

export function formatCurrency(
  value: number,
  locale: string,
  currency: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(withWesternNumerals(locale), {
    style: "currency",
    currency,
    ...options,
  }).format(value);
}
