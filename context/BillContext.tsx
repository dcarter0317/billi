import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseDate } from '../utils/date';

export interface PaymentRecord {
    id: string;
    date: string;
    amount: string;
    installmentNumber: number;
}

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
    occurrence?: 'Every Month' | 'Every Week' | 'Twice a Week' | 'Twice a Month' | 'Every Other Week' | 'One Time' | 'Installments';
    dueDays?: number[]; // 1-31 for months, 0-6 for weeks
    totalInstallments?: number;
    paidInstallments?: number;
    totalInstallmentAmount?: string;
    installmentStartDate?: string;
    installmentEndDate?: string;
    installmentRecurrence?: 'bi-weekly' | 'monthly';
    remainingBalance?: string;
    paymentHistory?: PaymentRecord[];
    notes?: string;
    isRecurring?: boolean;
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
    deletePaymentRecord: (billId: string, recordId: string) => Promise<void>;
    resetToDefaults: () => Promise<void>;
}

const BillContext = createContext<BillContextType | undefined>(undefined);

const DUMMY_BILLS: Bill[] = [
    // JANUARY 2026 - PAST/PAID
    { id: '101', title: 'Rent', amount: '1250.00', dueDate: '01-01-2026', isPaid: true, isCleared: true, clearedDate: '01-02-2026', category: 'Housing', occurrence: 'Every Month', dueDays: [1], isRecurring: true, notes: 'Rent includes water and trash' },
    { id: '102', title: 'Spotify', amount: '12.99', dueDate: '01-03-2026', isPaid: true, isCleared: true, clearedDate: '01-04-2026', category: 'Subscriptions', occurrence: 'Every Month', dueDays: [3], isRecurring: true },
    { id: '103', title: 'Gym Membership', amount: '45.00', dueDate: '01-05-2026', isPaid: true, isCleared: true, clearedDate: '01-06-2026', category: 'Health & Fitness', occurrence: 'Every Month', dueDays: [5], isRecurring: true },
    { id: '104', title: 'Electric Bill', amount: '145.20', dueDate: '01-10-2026', isPaid: true, isCleared: true, clearedDate: '01-11-2026', category: 'Utilities', occurrence: 'Every Month', dueDays: [10] },
    { id: '105', title: 'Internet (Verizon)', amount: '79.99', dueDate: '01-12-2026', isPaid: true, isCleared: true, clearedDate: '01-13-2026', category: 'Utilities', occurrence: 'Every Month', dueDays: [12] },
    { id: '106', title: 'Netflix', amount: '15.49', dueDate: '01-14-2026', isPaid: true, isCleared: true, clearedDate: '01-15-2026', category: 'Subscriptions', occurrence: 'Every Month', dueDays: [14] },
    { id: '107', title: 'Credit Card (Chase)', amount: '620.00', dueDate: '01-22-2026', isPaid: true, isCleared: true, clearedDate: '01-23-2026', category: 'Credit Card', occurrence: 'Every Month', dueDays: [22] },

    // FEBRUARY 2026 - PAST/PAID
    { id: '1', title: 'Rent', amount: '1250.00', dueDate: '02-01-2026', isPaid: true, isCleared: true, clearedDate: '02-02-2026', category: 'Housing', occurrence: 'Every Month', dueDays: [1] },
    { id: '2', title: 'Spotify', amount: '12.99', dueDate: '02-03-2026', isPaid: true, isCleared: true, clearedDate: '02-04-2026', category: 'Subscriptions', occurrence: 'Every Month', dueDays: [3] },
    { id: '3', title: 'Gym Membership', amount: '45.00', dueDate: '02-05-2026', isPaid: true, isCleared: true, clearedDate: '02-06-2026', category: 'Health & Fitness', occurrence: 'Every Month', dueDays: [5] },
    { id: '4', title: 'Car Insurance', amount: '110.50', dueDate: '02-07-2026', isPaid: true, isCleared: false, category: 'Insurance', occurrence: 'Every Month', dueDays: [7] },
    { id: 'feb-car', title: 'Car Payment', amount: '350.00', dueDate: '02-05-2026', isPaid: true, isCleared: true, clearedDate: '02-06-2026', category: 'Transportation', occurrence: 'Every Month', dueDays: [5] },
    { id: 'feb-groc-1', title: 'Groceries (Wk 1)', amount: '185.50', dueDate: '02-07-2026', isPaid: true, isCleared: true, clearedDate: '02-08-2026', category: 'Food & Dining', occurrence: 'Every Week', dueDays: [7] },

    // FEBRUARY 2026 - UPCOMING/UNPAID
    { id: '5', title: 'Electric Bill', amount: '95.20', dueDate: '02-10-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [10] },
    { id: '6', title: 'Internet (Verizon)', amount: '79.99', dueDate: '02-12-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [12] },
    { id: '7', title: 'Netflix', amount: '15.49', dueDate: '02-14-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [14] },
    { id: '8', title: 'Student Loan', amount: '300.00', dueDate: '02-15-2026', isPaid: false, isCleared: false, category: 'Debt & Loans', occurrence: 'Every Month', dueDays: [15] },
    { id: '9', title: 'Water Bill', amount: '40.00', dueDate: '02-18-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [18] },
    { id: '10', title: 'Cloud Storage', amount: '9.99', dueDate: '02-20-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [20] },
    { id: '11', title: 'Credit Card (Chase)', amount: '500.00', dueDate: '02-22-2026', isPaid: false, isCleared: false, category: 'Credit Card', occurrence: 'Every Month', dueDays: [22] },
    { id: '12', title: 'Mobile Phone', amount: '85.00', dueDate: '02-24-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [24] },
    { id: '13', title: 'Hulu', amount: '14.99', dueDate: '02-25-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [25] },
    { id: '14', title: 'Trash Collection', amount: '25.00', dueDate: '02-27-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [27] },
    { id: '15', title: 'Groceries (Wk 4)', amount: '200.00', dueDate: '02-28-2026', isPaid: false, isCleared: false, category: 'Food & Dining', occurrence: 'Every Week', dueDays: [28] },
    { id: 'feb-groc-2', title: 'Groceries (Wk 2)', amount: '210.25', dueDate: '02-14-2026', isPaid: true, isCleared: true, clearedDate: '02-15-2026', category: 'Food & Dining', occurrence: 'Every Week', dueDays: [14] },
    { id: 'feb-fuel', title: 'Gas Station', amount: '45.00', dueDate: '02-15-2026', isPaid: true, isCleared: true, clearedDate: '02-16-2026', category: 'Transportation', occurrence: 'Every Month', dueDays: [15] },
    { id: 'feb-groc-3', title: 'Groceries (Wk 3)', amount: '190.00', dueDate: '02-21-2026', isPaid: false, isCleared: false, category: 'Food & Dining', occurrence: 'Every Week', dueDays: [21] },

    // MARCH 2026
    { id: '16', title: 'Rent', amount: '1250.00', dueDate: '03-01-2026', isPaid: false, isCleared: false, category: 'Housing', occurrence: 'Every Month', dueDays: [1], isRecurring: true, notes: 'Check for annual increase in April' },
    { id: '17', title: 'Spotify', amount: '12.99', dueDate: '03-03-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [3], isRecurring: true },
    { id: '18', title: 'Gym Membership', amount: '45.00', dueDate: '03-05-2026', isPaid: false, isCleared: false, category: 'Health & Fitness', occurrence: 'Every Month', dueDays: [5] },
    { id: '19', title: 'Car Insurance', amount: '110.50', dueDate: '03-07-2026', isPaid: false, isCleared: false, category: 'Insurance', occurrence: 'Every Month', dueDays: [7] },
    { id: '20', title: 'Electric Bill', amount: '90.00', dueDate: '03-10-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [10] },
    { id: 'mar-car', title: 'Car Payment', amount: '350.00', dueDate: '03-05-2026', isPaid: false, isCleared: false, category: 'Transportation', occurrence: 'Every Month', dueDays: [5] },
    { id: 'mar-groc-1', title: 'Groceries (Wk 1)', amount: '200.00', dueDate: '03-07-2026', isPaid: false, isCleared: false, category: 'Food & Dining', occurrence: 'Every Week', dueDays: [7] },
    { id: 'mar-dentist', title: 'Dentist Visit', amount: '150.00', dueDate: '03-12-2026', isPaid: false, isCleared: false, category: 'Health & Fitness', occurrence: 'One Time' },
    { id: '21', title: 'Internet (Verizon)', amount: '79.99', dueDate: '03-12-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [12] },
    { id: '22', title: 'Heated Storage', amount: '120.00', dueDate: '03-12-2026', isPaid: false, isCleared: false, category: 'Custom', occurrence: 'Every Month', dueDays: [12] },
    { id: '23', title: 'Netflix', amount: '15.49', dueDate: '03-14-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [14] },
    { id: '24', title: 'Student Loan', amount: '300.00', dueDate: '03-15-2026', isPaid: false, isCleared: false, category: 'Debt & Loans', occurrence: 'Every Month', dueDays: [15] },
    { id: '25', title: 'Water Bill', amount: '42.00', dueDate: '03-18-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [18] },
    { id: '26', title: 'Cloud Storage', amount: '9.99', dueDate: '03-20-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [20] },
    { id: '27', title: 'Credit Card (Chase)', amount: '450.00', dueDate: '03-22-2026', isPaid: false, isCleared: false, category: 'Credit Card', occurrence: 'Every Month', dueDays: [22] },
    { id: '28', title: 'Mobile Phone', amount: '85.00', dueDate: '03-24-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [24] },
    { id: '29', title: 'Hulu', amount: '14.99', dueDate: '03-25-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [25] },
    { id: '30', title: 'Furniture Installment', amount: '150.00', dueDate: '03-26-2026', isPaid: false, isCleared: false, category: 'Shopping', occurrence: 'Installments', totalInstallments: 6, paidInstallments: 2, dueDays: [26] },
    { id: 'mar-groc-2', title: 'Groceries (Wk 2)', amount: '200.00', dueDate: '03-14-2026', isPaid: false, isCleared: false, category: 'Food & Dining', occurrence: 'Every Week', dueDays: [14] },
    { id: 'mar-fuel', title: 'Gas Station', amount: '50.00', dueDate: '03-15-2026', isPaid: false, isCleared: false, category: 'Transportation', occurrence: 'Every Month', dueDays: [15] },
    { id: 'mar-groc-3', title: 'Groceries (Wk 3)', amount: '200.00', dueDate: '03-21-2026', isPaid: false, isCleared: false, category: 'Food & Dining', occurrence: 'Every Week', dueDays: [21] },
    { id: 'mar-gift', title: 'Mom\'s Birthday Gift', amount: '100.00', dueDate: '03-22-2026', isPaid: false, isCleared: false, category: 'Shopping', occurrence: 'One Time' },
    { id: 'mar-groc-4', title: 'Groceries (Wk 4)', amount: '200.00', dueDate: '03-28-2026', isPaid: false, isCleared: false, category: 'Food & Dining', occurrence: 'Every Week', dueDays: [28] },

    // APRIL 2026
    { id: '31', title: 'Rent', amount: '1250.00', dueDate: '04-01-2026', isPaid: false, isCleared: false, category: 'Housing', occurrence: 'Every Month', dueDays: [1] },
    { id: '32', title: 'Spotify', amount: '12.99', dueDate: '04-03-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [3] },
    { id: '33', title: 'Gym Membership', amount: '45.00', dueDate: '04-05-2026', isPaid: false, isCleared: false, category: 'Health & Fitness', occurrence: 'Every Month', dueDays: [5] },
    { id: '34', title: 'Car Insurance', amount: '110.50', dueDate: '04-07-2026', isPaid: false, isCleared: false, category: 'Insurance', occurrence: 'Every Month', dueDays: [7] },
    { id: '35', title: 'Electric Bill', amount: '88.00', dueDate: '04-10-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [10] },
    { id: '36', title: 'Internet (Verizon)', amount: '79.99', dueDate: '04-12-2026', isPaid: false, isCleared: false, category: 'Utilities', occurrence: 'Every Month', dueDays: [12] },
    { id: '37', title: 'Netflix', amount: '15.49', dueDate: '04-14-2026', isPaid: false, isCleared: false, category: 'Subscriptions', occurrence: 'Every Month', dueDays: [14] },
    { id: '38', title: 'Furniture Installment', amount: '150.00', dueDate: '04-26-2026', isPaid: false, isCleared: false, category: 'Shopping', occurrence: 'Installments', totalInstallments: 6, paidInstallments: 3, dueDays: [26] },
];

const STORAGE_KEY = 'billi_bills_data';

export function BillProvider({ children }: { children: ReactNode }) {
    console.log('--- BILL PROVIDER MOUNTED: PLACEHOLDER DATA VERSION ---');
    const [bills, setBillsState] = useState<Bill[]>(DUMMY_BILLS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshBills = async () => {
        setLoading(true);
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setBillsState(JSON.parse(stored));
            } else {
                // If it's the first time, use dummy data and save it
                setBillsState(DUMMY_BILLS);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DUMMY_BILLS));
            }
        } catch (err) {
            console.error('Error loading bills:', err);
            setError('Failed to load bills.');
        } finally {
            setLoading(false);
        }
    };

    const saveBillsToStorage = async (newBills: Bill[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newBills));
        } catch (err) {
            console.error('Error saving bills:', err);
        }
    };

    useEffect(() => {
        // Simulate initial load
        refreshBills();
    }, []);

    const addBill = async (bill: Omit<Bill, 'id'>) => {
        setLoading(true);
        try {
            const newBill: Bill = {
                id: Math.random().toString(36).substr(2, 9),
                ...bill,
                order: bills.length // Simple append order
            };
            const updatedBills = [...bills, newBill];
            setBillsState(updatedBills);
            await saveBillsToStorage(updatedBills);
        } catch (err) {
            console.error('Error adding bill:', err);
            setError('Failed to add bill locally.');
        } finally {
            setLoading(false);
        }
    };

    const updateBill = async (id: string, updates: Partial<Bill>) => {
        const updatedBills = bills.map(b => b.id === id ? { ...b, ...updates } : b);
        setBillsState(updatedBills);
        await saveBillsToStorage(updatedBills);
    };

    const deleteBill = async (id: string) => {
        const updatedBills = bills.filter(b => b.id !== id);
        setBillsState(updatedBills);
        await saveBillsToStorage(updatedBills);
    };

    const toggleBillStatus = async (id: string) => {
        const bill = bills.find(b => b.id === id);
        if (!bill) return;

        const newIsPaid = !bill.isPaid;
        let updates: Partial<Bill> = { isPaid: newIsPaid };

        // Auto-increment installments if it's an installment bill and being marked as paid
        if (newIsPaid && bill.occurrence === 'Installments') {
            const currentPaid = bill.paidInstallments || 0;
            const total = bill.totalInstallments || Infinity;

            if (currentPaid < total) {
                const nextInstallmentNum = currentPaid + 1;
                updates.paidInstallments = nextInstallmentNum;

                // Add Payment Record
                const now = new Date();
                const formattedDate = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
                const newRecord: PaymentRecord = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: formattedDate,
                    amount: bill.amount,
                    installmentNumber: nextInstallmentNum
                };
                updates.paymentHistory = [...(bill.paymentHistory || []), newRecord];

                // Recalculate remaining balance
                if (bill.totalInstallmentAmount && bill.amount) {
                    const totalAmt = parseFloat(bill.totalInstallmentAmount);
                    const instAmt = parseFloat(bill.amount);
                    updates.remainingBalance = (totalAmt - (instAmt * nextInstallmentNum)).toFixed(2);
                }
            }
        }

        await updateBill(id, updates);
    };

    const deletePaymentRecord = async (billId: string, recordId: string) => {
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;

        const recordToDelete = bill.paymentHistory?.find(r => r.id === recordId);
        if (!recordToDelete) return;

        const newHistory = bill.paymentHistory?.filter(r => r.id !== recordId) || [];
        const newPaidCount = Math.max(0, (bill.paidInstallments || 0) - 1);

        const updates: Partial<Bill> = {
            paymentHistory: newHistory,
            paidInstallments: newPaidCount,
        };

        // Recalculate remaining balance
        if (bill.totalInstallmentAmount && bill.amount) {
            const totalAmt = parseFloat(bill.totalInstallmentAmount);
            const instAmt = parseFloat(bill.amount);
            updates.remainingBalance = (totalAmt - (instAmt * newPaidCount)).toFixed(2);
        }

        await updateBill(billId, updates);
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

            // Handle Recurring Payment Carry-over
            if (bill.isRecurring) {
                const currentDueDate = parseDate(bill.dueDate);
                let nextDueDate = new Date(currentDueDate);

                switch (bill.occurrence) {
                    case 'Every Week':
                        nextDueDate.setDate(currentDueDate.getDate() + 7);
                        break;
                    case 'Every Other Week':
                        nextDueDate.setDate(currentDueDate.getDate() + 14);
                        break;
                    case 'Twice a Month':
                        // Simple 15 day logic or logic based on current date
                        // For simplicity, let's assume it moves 15 days, or better yet, to next occurrence
                        nextDueDate.setDate(currentDueDate.getDate() + 15);
                        break;
                    case 'Every Month':
                    case 'Installments':
                        nextDueDate.setMonth(currentDueDate.getMonth() + 1);
                        break;
                    case 'Twice a Week':
                        nextDueDate.setDate(currentDueDate.getDate() + 3); // Approximation
                        break;
                    default:
                        // Default to 1 month if frequency is unhandled or One Time (though One Time shouldn't be recurring)
                        nextDueDate.setMonth(currentDueDate.getMonth() + 1);
                }

                // Format back to MM-DD-YYYY
                const nextFormattedDate = `${String(nextDueDate.getMonth() + 1).padStart(2, '0')}-${String(nextDueDate.getDate()).padStart(2, '0')}-${nextDueDate.getFullYear()}`;

                updates.dueDate = nextFormattedDate;
                updates.isPaid = false;
                updates.isCleared = false;
                updates.clearedDate = undefined;

                // Alert the user that it moved? We don't have access to UI here, 
                // but the state update will reflect immediately.
            }
        } else {
            updates.clearedDate = undefined;
        }

        await updateBill(id, updates);
    };

    const resetAllStatuses = async () => {
        const updatedBills = bills.map(b => ({ ...b, isPaid: false, isCleared: false, clearedDate: undefined }));
        setBillsState(updatedBills);
        await saveBillsToStorage(updatedBills);
    };

    const setBills = async (newBills: Bill[]) => {
        setBillsState(newBills);
        await saveBillsToStorage(newBills);
    };



    const resetToDefaults = async () => {
        setBillsState(DUMMY_BILLS);
        await saveBillsToStorage(DUMMY_BILLS);
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
            refreshBills,
            deletePaymentRecord,
            resetToDefaults
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
