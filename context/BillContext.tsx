import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Bill {
    id: string;
    title: string;
    amount: string;
    dueDate: string;
    isPaid: boolean;
    isCleared: boolean;
    clearedDate?: string;
    category: string;
    order?: number;
    recurrenceDay?: number; // Kept for legacy/migration
    frequency?: 'Every Month' | 'Every Week' | 'Twice a Week' | 'Twice a Month' | 'Every Other Week' | 'Installments';
    dueDays?: number[]; // 1-31 for months, 0-6 for weeks
    totalInstallments?: number;
    paidInstallments?: number;
    totalInstallmentAmount?: string;
    installmentStartDate?: string;
    installmentEndDate?: string;
    installmentRecurrence?: 'bi-weekly' | 'monthly';
    remainingBalance?: string;
}

interface BillContextType {
    bills: Bill[];
    loading: boolean;
    error: string | null;
    addBill: (bill: Omit<Bill, 'id'>) => Promise<void>;
    updateBill: (id: string, updates: Partial<Bill>) => Promise<void>;
    deleteBill: (id: string) => Promise<void>;
    toggleBillStatus: (id: string) => Promise<void>;
    toggleClearStatus: (id: string) => Promise<void>;
    resetAllStatuses: () => Promise<void>;
    setBills: (bills: Bill[]) => void;
    refreshBills: () => Promise<void>;
}

const BillContext = createContext<BillContextType | undefined>(undefined);

const DUMMY_BILLS: Bill[] = [
    // JANUARY 2026 - PAST/PAID
    { id: '101', title: 'Rent', amount: '1250.00', dueDate: '01-01-2026', isPaid: true, isCleared: true, clearedDate: '01-02-2026', category: 'Housing', frequency: 'Every Month', dueDays: [1] },
    { id: '102', title: 'Spotify', amount: '12.99', dueDate: '01-03-2026', isPaid: true, isCleared: true, clearedDate: '01-04-2026', category: 'Subscriptions', frequency: 'Every Month', dueDays: [3] },
    { id: '103', title: 'Gym Membership', amount: '45.00', dueDate: '01-05-2026', isPaid: true, isCleared: true, clearedDate: '01-06-2026', category: 'Health & Fitness', frequency: 'Every Month', dueDays: [5] },
    { id: '104', title: 'Electric Bill', amount: '145.20', dueDate: '01-10-2026', isPaid: true, isCleared: true, clearedDate: '01-11-2026', category: 'Utilities', frequency: 'Every Month', dueDays: [10] },
    { id: '105', title: 'Internet (Verizon)', amount: '79.99', dueDate: '01-12-2026', isPaid: true, isCleared: true, clearedDate: '01-13-2026', category: 'Utilities', frequency: 'Every Month', dueDays: [12] },
    { id: '106', title: 'Netflix', amount: '15.49', dueDate: '01-14-2026', isPaid: true, isCleared: true, clearedDate: '01-15-2026', category: 'Subscriptions', frequency: 'Every Month', dueDays: [14] },
    { id: '107', title: 'Credit Card (Chase)', amount: '620.00', dueDate: '01-22-2026', isPaid: true, isCleared: true, clearedDate: '01-23-2026', category: 'Credit Card', frequency: 'Every Month', dueDays: [22] },

    // FEBRUARY 2026 - PAST/PAID
    { id: '1', title: 'Rent', amount: '1250.00', dueDate: '02-01-2026', isPaid: true, isCleared: true, clearedDate: '02-02-2026', category: 'Housing', frequency: 'Every Month', dueDays: [1] },
    { id: '2', title: 'Spotify', amount: '12.99', dueDate: '02-03-2026', isPaid: true, isCleared: true, clearedDate: '02-04-2026', category: 'Subscriptions', frequency: 'Every Month', dueDays: [3] },
    { id: '3', title: 'Gym Membership', amount: '45.00', dueDate: '02-05-2026', isPaid: true, isCleared: true, clearedDate: '02-06-2026', category: 'Health & Fitness', frequency: 'Every Month', dueDays: [5] },
    { id: '4', title: 'Car Insurance', amount: '110.50', dueDate: '02-07-2026', isPaid: true, isCleared: false, category: 'Insurance', frequency: 'Every Month', dueDays: [7] },

    // FEBRUARY 2026 - UPCOMING/UNPAID
    { id: '5', title: 'Electric Bill', amount: '95.20', dueDate: '02-10-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [10] },
    { id: '6', title: 'Internet (Verizon)', amount: '79.99', dueDate: '02-12-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [12] },
    { id: '7', title: 'Netflix', amount: '15.49', dueDate: '02-14-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [14] },
    { id: '8', title: 'Student Loan', amount: '300.00', dueDate: '02-15-2026', isPaid: false, isCleared: false, category: 'Debt & Loans', frequency: 'Every Month', dueDays: [15] },
    { id: '9', title: 'Water Bill', amount: '40.00', dueDate: '02-18-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [18] },
    { id: '10', title: 'Cloud Storage', amount: '9.99', dueDate: '02-20-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [20] },
    { id: '11', title: 'Credit Card (Chase)', amount: '500.00', dueDate: '02-22-2026', isPaid: false, isCleared: false, category: 'Credit Card', frequency: 'Every Month', dueDays: [22] },
    { id: '12', title: 'Mobile Phone', amount: '85.00', dueDate: '02-24-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [24] },
    { id: '13', title: 'Hulu', amount: '14.99', dueDate: '02-25-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [25] },
    { id: '14', title: 'Trash Collection', amount: '25.00', dueDate: '02-27-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [27] },
    { id: '15', title: 'Groceries (Wk 4)', amount: '200.00', dueDate: '02-28-2026', isPaid: false, isCleared: false, category: 'Food & Dining', frequency: 'Every Week', dueDays: [6] }, // Saturday

    // MARCH 2026
    { id: '16', title: 'Rent', amount: '1250.00', dueDate: '03-01-2026', isPaid: false, isCleared: false, category: 'Housing', frequency: 'Every Month', dueDays: [1] },
    { id: '17', title: 'Spotify', amount: '12.99', dueDate: '03-03-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [3] },
    { id: '18', title: 'Gym Membership', amount: '45.00', dueDate: '03-05-2026', isPaid: false, isCleared: false, category: 'Health & Fitness', frequency: 'Every Month', dueDays: [5] },
    { id: '19', title: 'Car Insurance', amount: '110.50', dueDate: '03-07-2026', isPaid: false, isCleared: false, category: 'Insurance', frequency: 'Every Month', dueDays: [7] },
    { id: '20', title: 'Electric Bill', amount: '90.00', dueDate: '03-10-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [10] },
    { id: '21', title: 'Internet (Verizon)', amount: '79.99', dueDate: '03-12-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [12] },
    { id: '22', title: 'Heated Storage', amount: '120.00', dueDate: '03-12-2026', isPaid: false, isCleared: false, category: 'Custom', frequency: 'Every Month', dueDays: [12] },
    { id: '23', title: 'Netflix', amount: '15.49', dueDate: '03-14-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [14] },
    { id: '24', title: 'Student Loan', amount: '300.00', dueDate: '03-15-2026', isPaid: false, isCleared: false, category: 'Debt & Loans', frequency: 'Every Month', dueDays: [15] },
    { id: '25', title: 'Water Bill', amount: '42.00', dueDate: '03-18-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [18] },
    { id: '26', title: 'Cloud Storage', amount: '9.99', dueDate: '03-20-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [20] },
    { id: '27', title: 'Credit Card (Chase)', amount: '450.00', dueDate: '03-22-2026', isPaid: false, isCleared: false, category: 'Credit Card', frequency: 'Every Month', dueDays: [22] },
    { id: '28', title: 'Mobile Phone', amount: '85.00', dueDate: '03-24-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [24] },
    { id: '29', title: 'Hulu', amount: '14.99', dueDate: '03-25-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [25] },
    { id: '30', title: 'Furniture Installment', amount: '150.00', dueDate: '03-26-2026', isPaid: false, isCleared: false, category: 'Shopping', frequency: 'Installments', totalInstallments: 6, paidInstallments: 2, dueDays: [26] },

    // APRIL 2026
    { id: '31', title: 'Rent', amount: '1250.00', dueDate: '04-01-2026', isPaid: false, isCleared: false, category: 'Housing', frequency: 'Every Month', dueDays: [1] },
    { id: '32', title: 'Spotify', amount: '12.99', dueDate: '04-03-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [3] },
    { id: '33', title: 'Gym Membership', amount: '45.00', dueDate: '04-05-2026', isPaid: false, isCleared: false, category: 'Health & Fitness', frequency: 'Every Month', dueDays: [5] },
    { id: '34', title: 'Car Insurance', amount: '110.50', dueDate: '04-07-2026', isPaid: false, isCleared: false, category: 'Insurance', frequency: 'Every Month', dueDays: [7] },
    { id: '35', title: 'Electric Bill', amount: '88.00', dueDate: '04-10-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [10] },
    { id: '36', title: 'Internet (Verizon)', amount: '79.99', dueDate: '04-12-2026', isPaid: false, isCleared: false, category: 'Utilities', frequency: 'Every Month', dueDays: [12] },
    { id: '37', title: 'Netflix', amount: '15.49', dueDate: '04-14-2026', isPaid: false, isCleared: false, category: 'Subscriptions', frequency: 'Every Month', dueDays: [14] },
    { id: '38', title: 'Furniture Installment', amount: '150.00', dueDate: '04-26-2026', isPaid: false, isCleared: false, category: 'Shopping', frequency: 'Installments', totalInstallments: 6, paidInstallments: 3, dueDays: [26] },
];

export function BillProvider({ children }: { children: ReactNode }) {
    console.log('--- BILL PROVIDER MOUNTED: PLACEHOLDER DATA VERSION ---');
    const [bills, setBillsState] = useState<Bill[]>(DUMMY_BILLS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Simulate initial load
        refreshBills();
    }, []);

    const refreshBills = async () => {
        setLoading(true);
        // Simulate network delay
        setTimeout(() => {
            setBillsState(prev => [...prev]); // Just keep existing or reset to DUMMY if needed
            setLoading(false);
        }, 500);
    };

    const addBill = async (bill: Omit<Bill, 'id'>) => {
        setLoading(true);
        try {
            const newBill: Bill = {
                id: Math.random().toString(36).substr(2, 9),
                ...bill,
                order: bills.length // Simple append order
            };
            setBillsState(prev => [...prev, newBill]);
        } catch (err) {
            console.error('Error adding bill:', err);
            setError('Failed to add bill locally.');
        } finally {
            setLoading(false);
        }
    };

    const updateBill = async (id: string, updates: Partial<Bill>) => {
        setBillsState(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const deleteBill = async (id: string) => {
        setBillsState(prev => prev.filter(b => b.id !== id));
    };

    const toggleBillStatus = async (id: string) => {
        const bill = bills.find(b => b.id === id);
        if (!bill) return;
        await updateBill(id, { isPaid: !bill.isPaid });
    };

    const toggleClearStatus = async (id: string) => {
        const bill = bills.find(b => b.id === id);
        if (!bill) return;

        const newIsCleared = !bill.isCleared;
        let updates: Partial<Bill> = { isCleared: newIsCleared };

        if (newIsCleared) {
            const now = new Date();
            // Format as MM-DD-YYYY
            const formattedDate = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
            updates.clearedDate = formattedDate;
        } else {
            updates.clearedDate = undefined;
        }

        await updateBill(id, updates);
    };

    const resetAllStatuses = async () => {
        setBillsState(prev => prev.map(b => ({ ...b, isPaid: false, isCleared: false, clearedDate: undefined })));
    };

    const setBills = (newBills: Bill[]) => {
        setBillsState(newBills);
    };

    return (
        <BillContext.Provider value={{
            bills,
            loading,
            error,
            addBill,
            updateBill,
            deleteBill,
            toggleBillStatus,
            toggleClearStatus,
            resetAllStatuses,
            setBills,
            refreshBills
        }}>
            {children}
        </BillContext.Provider>
    );
}

export function useBills() {
    const context = useContext(BillContext);
    if (context === undefined) {
        throw new Error('useBills must be used within a BillProvider');
    }
    return context;
}
