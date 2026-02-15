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
