/** Amount pattern for a currency's minor-unit exponent: 0 -> whole numbers, 3 -> up to 3 decimals (OMR, KWD, BHD). */
export const decimalPattern = (decimals: number): RegExp => new RegExp(decimals <= 0 ? "^\\d+$" : `^\\d+(\\.\\d{1,${decimals}})?$`);

/** ISO-4217 minor units of the currencies the platform supports (the API's list is authoritative; this is for display only). */
const MINOR_UNITS: Record<string, number> = { OMR: 3, KWD: 3, BHD: 3, JPY: 0 };
export const currencyDecimals = (code?: string | null): number => (code ? MINOR_UNITS[code.toUpperCase()] ?? 2 : 2);
