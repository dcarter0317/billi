import React, { createContext, useContext, useState, ReactNode } from 'react';

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
    addBill: (bill: Omit<Bill, 'id'>) => void;
    updateBill: (id: string, updates: Partial<Bill>) => void;
    deleteBill: (id: string) => void;
    toggleBillStatus: (id: string) => void;
    toggleClearStatus: (id: string) => void;
    resetAllStatuses: () => void;
    setBills: (bills: Bill[]) => void;
}

const INITIAL_BILLS: Bill[] = [
    { id: '1', title: 'Netflix', amount: '15.99', dueDate: '02-01-2026', isPaid: true, isCleared: true, category: 'Entertainment', order: 0 },
    { id: '2', title: 'Rent', amount: '1800.00', dueDate: '02-05-2026', isPaid: false, isCleared: false, category: 'Housing', order: 1 },
    { id: '3', title: 'Spotify', amount: '9.99', dueDate: '02-12-2026', isPaid: true, isCleared: true, category: 'Entertainment', order: 2 },
    { id: '4', title: 'Internet', amount: '75.00', dueDate: '02-15-2026', isPaid: false, isCleared: false, category: 'Utilities', order: 3 },
    { id: '5', title: 'Electric Bill', amount: '120.50', dueDate: '02-08-2026', isPaid: false, isCleared: false, category: 'Utilities', order: 4 },
];

const BillContext = createContext<BillContextType | undefined>(undefined);

export function BillProvider({ children }: { children: ReactNode }) {
    const [bills, setBillsState] = useState<Bill[]>(INITIAL_BILLS);

    const addBill = (bill: Omit<Bill, 'id'>) => {
        const newBill = {
            ...bill,
            id: Math.random().toString(36).substr(2, 9),
            order: bills.length
        };
        setBillsState(prev => [...prev, newBill]);
    };

    const updateBill = (id: string, updates: Partial<Bill>) => {
        console.log('Context [updateBill] ID:', id, 'Updates:', updates);
        setBillsState(prev => {
            const updated = prev.map(b => b.id === id ? { ...b, ...updates } : b);
            const found = prev.some(b => b.id === id);
            if (!found) console.warn('Context [updateBill] ID not found in current list:', id);
            return updated;
        });
    };

    const deleteBill = (id: string) => {
        setBillsState(prev => prev.filter(b => b.id !== id));
    };

    const toggleBillStatus = (id: string) => {
        setBillsState(prev => prev.map(b => b.id === id ? { ...b, isPaid: !b.isPaid } : b));
    };

    const toggleClearStatus = (id: string) => {
        setBillsState(prev => prev.map(b => b.id === id ? { ...b, isCleared: !b.isCleared } : b));
    };

    const resetAllStatuses = () => {
        setBillsState(prev => prev.map(b => ({ ...b, isPaid: false, isCleared: false })));
    };

    const setBills = (newBills: Bill[]) => {
        setBillsState(newBills);
    };

    return (
        <BillContext.Provider value={{ bills, addBill, updateBill, deleteBill, toggleBillStatus, toggleClearStatus, resetAllStatuses, setBills }}>
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
