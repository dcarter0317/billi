import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseDate } from '../utils/date';
import { supabase } from '../services/supabase';
import { useUser } from './UserContext';

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

const STORAGE_KEY = 'billi_bills_data';

export function BillProvider({ children }: { children: ReactNode }) {
    console.log('--- BILL PROVIDER MOUNTED: DATABASE VERSION ---');
    const [bills, setBillsState] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user, isSignedIn } = useUser();

    const mapDbBillToLocal = (dbBill: any): Bill => ({
        id: dbBill.id,
        title: dbBill.title,
        amount: dbBill.amount?.toString() || '0.00',
        dueDate: dbBill.due_date,
        isPaid: dbBill.is_paid || false,
        isCleared: dbBill.is_cleared || false,
        clearedDate: dbBill.cleared_date || undefined,
        category: dbBill.category,
        order: dbBill.order || 0,
        occurrence: dbBill.occurrence || 'Every Month',
        dueDays: dbBill.due_days || [],
        totalInstallments: dbBill.total_installments ?? undefined,
        paidInstallments: dbBill.paid_installments ?? undefined,
        isRecurring: dbBill.is_recurring || false,
        notes: dbBill.notes || ''
    });

    const mapLocalBillToDb = (bill: Partial<Bill>, userId: string) => {
        const db: any = { user_id: userId };
        if (bill.title !== undefined) db.title = bill.title;
        if (bill.amount !== undefined) db.amount = parseFloat(bill.amount);
        if (bill.dueDate !== undefined) db.due_date = bill.dueDate;
        if (bill.isPaid !== undefined) db.is_paid = bill.isPaid;
        if (bill.isCleared !== undefined) db.is_cleared = bill.isCleared;
        if (bill.clearedDate !== undefined) db.cleared_date = bill.clearedDate;
        if (bill.category !== undefined) db.category = bill.category;
        if (bill.occurrence !== undefined) db.occurrence = bill.occurrence;
        if (bill.dueDays !== undefined) db.due_days = bill.dueDays;
        if (bill.totalInstallments !== undefined) db.total_installments = bill.totalInstallments;
        if (bill.paidInstallments !== undefined) db.paid_installments = bill.paidInstallments;
        if (bill.isRecurring !== undefined) db.is_recurring = bill.isRecurring;
        if (bill.notes !== undefined) db.notes = bill.notes;
        if (bill.order !== undefined) db.order = bill.order;
        return db;
    };

    const refreshBills = async () => {
        setLoading(true);
        try {
            if (isSignedIn && user) {
                const { data, error } = await supabase
                    .from('bills')
                    .select('*')
                    .order('order', { ascending: true });

                if (error) throw error;
                if (data) {
                    setBillsState(data.map(mapDbBillToLocal));
                    return;
                }
            }

            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setBillsState(JSON.parse(stored));
            } else {
                setBillsState([]);
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

    const recordTransaction = async (bill: Bill, type: 'PAID' | 'CLEARED') => {
        if (!isSignedIn || !user) return;

        try {
            const { error } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    bill_id: bill.id,
                    title: bill.title,
                    amount: parseFloat(bill.amount),
                    category: bill.category,
                    settlement_type: type,
                    notes: bill.notes
                });

            if (error) throw error;
        } catch (err) {
            console.error(`Failed to record ${type} transaction:`, err);
        }
    };

    useEffect(() => {
        refreshBills();
    }, [isSignedIn, user?.id]);

    const addBill = async (bill: Omit<Bill, 'id'>) => {
        setLoading(true);
        try {
            if (isSignedIn && user) {
                const dbBill = mapLocalBillToDb(bill, user.id);
                // Use a temporary but real-enough looking ID for optimism or just use random for now
                // Actually, the database might trigger an ID or we can provide one. 
                // Let's assume the table 'bills' uses a text ID as per schema
                dbBill.id = Math.random().toString(36).substr(2, 9);

                const { error } = await supabase.from('bills').insert(dbBill);
                if (error) throw error;
                await refreshBills();
            } else {
                const newBill: Bill = {
                    id: Math.random().toString(36).substr(2, 9),
                    ...bill as any,
                    order: bills.length
                };
                const updatedBills = [...bills, newBill];
                setBillsState(updatedBills);
                await saveBillsToStorage(updatedBills);
            }
        } catch (err) {
            console.error('Error adding bill:', err);
            setError('Failed to add bill.');
        } finally {
            setLoading(false);
        }
    };

    const updateBill = async (id: string, updates: Partial<Bill>) => {
        try {
            if (isSignedIn && user) {
                const dbUpdates = mapLocalBillToDb(updates, user.id);
                delete dbUpdates.user_id; // Don't try to update user_id

                const { error } = await supabase
                    .from('bills')
                    .update(dbUpdates)
                    .eq('id', id);

                if (error) throw error;
                // Update local state immediately for responsiveness
                setBillsState(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
            } else {
                const updatedBills = bills.map((b: Bill) => b.id === id ? { ...b, ...updates } : b);
                setBillsState(updatedBills);
                await saveBillsToStorage(updatedBills);
            }
        } catch (err) {
            console.error('Error updating bill:', err);
        }
    };

    const deleteBill = async (id: string) => {
        try {
            if (isSignedIn && user) {
                const { error } = await supabase
                    .from('bills')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setBillsState(prev => prev.filter(b => b.id !== id));
            } else {
                const updatedBills = bills.filter((b: Bill) => b.id !== id);
                setBillsState(updatedBills);
                await saveBillsToStorage(updatedBills);
            }
        } catch (err) {
            console.error('Error deleting bill:', err);
        }
    };

    const toggleBillStatus = async (id: string) => {
        const bill = bills.find((b: Bill) => b.id === id);
        if (!bill) return;

        const newIsPaid = !bill.isPaid;
        let updates: Partial<Bill> = { isPaid: newIsPaid };

        if (newIsPaid) {
            await recordTransaction(bill, 'PAID');
        }

        await updateBill(id, updates);
    };

    const deletePaymentRecord = async (billId: string, recordId: string) => {
        // This was previously for installments in payment history. 
        // We might need to implement a 'payment_records' table if we want this full backend.
        // For now, let's keep it local or partial. 
        console.warn('deletePaymentRecord not yet fully implemented for backend.');
    };

    const toggleClearStatus = async (id: string) => {
        const bill = bills.find((b: Bill) => b.id === id);
        if (!bill) return;

        const newIsCleared = !bill.isCleared;
        let updates: Partial<Bill> = { isCleared: newIsCleared };

        if (newIsCleared) {
            await recordTransaction(bill, 'CLEARED');
            const now = new Date();
            const formattedDate = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
            updates.clearedDate = formattedDate;

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
                        nextDueDate.setDate(currentDueDate.getDate() + 15);
                        break;
                    case 'Every Month':
                    case 'Installments':
                        nextDueDate.setMonth(currentDueDate.getMonth() + 1);
                        break;
                    case 'Twice a Week':
                        nextDueDate.setDate(currentDueDate.getDate() + 3);
                        break;
                    default:
                        nextDueDate.setMonth(currentDueDate.getMonth() + 1);
                }

                const nextFormattedDate = `${String(nextDueDate.getMonth() + 1).padStart(2, '0')}-${String(nextDueDate.getDate()).padStart(2, '0')}-${nextDueDate.getFullYear()}`;
                updates.dueDate = nextFormattedDate;
            }
        } else {
            updates.clearedDate = undefined;
        }

        await updateBill(id, updates);
    };

    const resetAllStatuses = async () => {
        // This is complex for a bulk update via Supabase if not careful, 
        // but for now let's just loop or update local.
        const updatedBills = bills.map((b: Bill) => ({ ...b, isPaid: false, isCleared: false, clearedDate: undefined }));
        setBillsState(updatedBills);
        if (!isSignedIn) {
            await saveBillsToStorage(updatedBills);
        }
    };

    const setBills = async (newBills: Bill[]) => {
        setBillsState(newBills);
        if (!isSignedIn) {
            await saveBillsToStorage(newBills);
        }
    };

    const resetToDefaults = async () => {
        setBillsState([]);
        if (!isSignedIn) {
            await saveBillsToStorage([]);
        }
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
