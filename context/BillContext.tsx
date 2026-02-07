import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Bill {
    id: string;
    title: string;
    amount: string;
    dueDate: string;
    isPaid: boolean;
    isCleared: boolean;
    category: string;
    order?: number;
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
    { id: '1', title: 'Rent', amount: '1200.00', dueDate: '02-01-2026', isPaid: true, isCleared: true, category: 'Housing', order: 0 },
    { id: '2', title: 'Car Payment', amount: '350.00', dueDate: '02-05-2026', isPaid: false, isCleared: false, category: 'Transport', order: 1 },
    { id: '3', title: 'Electric Bill', amount: '120.00', dueDate: '02-15-2026', isPaid: false, isCleared: false, category: 'Utilities', order: 2 },
    { id: '4', title: 'Internet', amount: '80.00', dueDate: '02-20-2026', isPaid: false, isCleared: false, category: 'Utilities', order: 3 },
    { id: '5', title: 'Netflix', amount: '15.99', dueDate: '02-25-2026', isPaid: false, isCleared: false, category: 'Entertainment', order: 4 },
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
        await updateBill(id, { isCleared: !bill.isCleared });
    };

    const resetAllStatuses = async () => {
        setBillsState(prev => prev.map(b => ({ ...b, isPaid: false, isCleared: false })));
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
