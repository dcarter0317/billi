// Shared types used across multiple screens

export type FilterPeriod = 'last' | 'this' | 'next' | 'all' | 'monthly';

export interface Transaction {
    id: string;
    user_id: string;
    bill_id: string | null;
    title: string;
    amount: string;
    category: string;
    transaction_date: string;
    settlement_type: 'PAID' | 'CLEARED';
    notes?: string;
}
