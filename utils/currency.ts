/**
 * Returns the currency symbol for a given currency code.
 * Supports all currencies offered in the app settings.
 */
export function getCurrencySymbol(currency: string): string {
    switch (currency) {
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'JPY': return '¥';
        case 'CAD': return 'CA$';
        case 'AUD': return 'A$';
        case 'USD':
        default:
            return '$';
    }
}

/**
 * Formats a numeric string or number as a currency amount with exactly two decimal places.
 * Example: "100" -> "100.00", 100.5 -> "100.50"
 */
export function formatAmount(amount: string | number | undefined | null): string {
    if (amount === undefined || amount === null) return '0.00';
    const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(parsed)) return '0.00';
    return parsed.toFixed(2);
}
