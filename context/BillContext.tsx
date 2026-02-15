import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseDate, formatDate } from '../utils/date';
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
    occurrence?: 'Every Month' | 'Every Week' | 'Twice a Week' | 'Twice a Month' | 'Every Other Week' | 'Every Quarter' | 'Every Year' | 'One Time' | 'Installments';
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
}

const BillContext = createContext<BillContextType | undefined>(undefined);

const STORAGE_KEY = 'billi_bills_data';

export function BillProvider({ children }: { children: ReactNode }) {

    const [bills, setBillsState] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user, isSignedIn } = useUser();

    interface DbBill {
        id: string;
        user_id: string;
        title: string;
        amount: number;
        due_date: string;
        is_paid: boolean;
        is_cleared: boolean;
        cleared_date: string | null;
        category: string;
        order: number;
        occurrence: string;
        due_days: number[] | null;
        total_installments: number | null;
        paid_installments: number | null;
        is_recurring: boolean;
        notes: string | null;
    }

    const mapDbBillToLocal = (dbBill: DbBill): Bill => ({
        id: dbBill.id,
        title: dbBill.title,
        amount: dbBill.amount?.toString() || '0.00',
        dueDate: formatDate(parseDate(dbBill.due_date)),
        isPaid: dbBill.is_paid || false,
        isCleared: dbBill.is_cleared || false,
        clearedDate: dbBill.cleared_date ? formatDate(parseDate(dbBill.cleared_date)) : undefined,
        category: dbBill.category,
        order: dbBill.order || 0,
        occurrence: (dbBill.occurrence as Bill['occurrence']) || 'Every Month',
        dueDays: dbBill.due_days || [],
        totalInstallments: dbBill.total_installments ?? undefined,
        paidInstallments: dbBill.paid_installments ?? undefined,
        isRecurring: dbBill.is_recurring || false,
        notes: dbBill.notes || ''
    });

    const toDbDate = (dateStr: string): string => {
        const d = parseDate(dateStr);
        // Use local date components, NOT toISOString() which converts to UTC
        // and can shift the date ±1 day depending on timezone
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const mapLocalBillToDb = (bill: Partial<Bill>, userId: string): Partial<DbBill> => {
        const db: any = { user_id: userId };
        if (bill.title !== undefined) db.title = bill.title;
        if (bill.amount !== undefined) db.amount = parseFloat(bill.amount);
        if (bill.dueDate !== undefined) db.due_date = toDbDate(bill.dueDate);
        if (bill.isPaid !== undefined) db.is_paid = bill.isPaid;
        if (bill.isCleared !== undefined) db.is_cleared = bill.isCleared;
        if (bill.clearedDate !== undefined) db.cleared_date = bill.clearedDate ? toDbDate(bill.clearedDate) : null;
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
            // Deduplication logic: Check for an existing transaction for this bill created today.
            const today = new Date().toISOString().split('T')[0];

            const { data: existingRows, error: fetchError } = await supabase
                .from('transactions')
                .select('id, settlement_type')
                .eq('bill_id', bill.id)
                .gte('transaction_date', today)
                .limit(1);

            const existing = existingRows?.[0] ?? null;

            if (fetchError) throw fetchError;

            if (existing) {
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update({
                        settlement_type: type,
                        amount: parseFloat(bill.amount),
                        transaction_date: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
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

                if (insertError) throw insertError;
            }
        } catch (err) {
            console.error(`Failed to record ${type} transaction:`, err);
        }
    };

    useEffect(() => {
        refreshBills();
    }, [isSignedIn, user?.id]);

    const addBill = async (bill: Omit<Bill, 'id'>) => {
        setLoading(true);
        setError(null);

        // Optimistic UI update: Create a temporary bill
        const tempId = `temp-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticBill: Bill = {
            id: tempId,
            ...bill as any,
            order: bills.length // Add to end for now
        };

        // Update local state immediately
        setBillsState(prev => [...prev, optimisticBill]);

        try {
            if (isSignedIn && user) {
                const localBill: Omit<Bill, 'id'> = {
                    ...bill,
                    dueDate: formatDate(parseDate(bill.dueDate)),
                    clearedDate: bill.clearedDate ? formatDate(parseDate(bill.clearedDate)) : undefined
                };
                const dbBill = mapLocalBillToDb(localBill, user.id);
                const { data, error: insertError } = await supabase
                    .from('bills')
                    .insert(dbBill)
                    .select()
                    .single();

                if (insertError) throw insertError;

                if (data) {
                    // Replace temp bill with real one from DB
                    const realBill = mapDbBillToLocal(data);
                    setBillsState(prev => prev.map(b => b.id === tempId ? realBill : b));
                }
            } else {
                const updatedBills = bills.map(b => b.id === tempId ? { ...b, id: Math.random().toString(36).substr(2, 9) } : b);
                setBillsState(updatedBills);
                await saveBillsToStorage(updatedBills);
            }
        } catch (err: any) {
            console.error('Error adding bill:', err);
            setError(err.message || 'Failed to add bill.');
            // Rollback optimistic update
            setBillsState(prev => prev.filter(b => b.id !== tempId));
        } finally {
            setLoading(false);
        }
    };

    const updateBill = async (id: string, updates: Partial<Bill>) => {
        const originalBill = bills.find(b => b.id === id);
        if (!originalBill) return;

        // Optimistic UI
        setBillsState(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

        try {
            if (isSignedIn && user) {
                const dbUpdates = mapLocalBillToDb(updates, user.id);
                delete (dbUpdates as any).id;
                delete dbUpdates.user_id;

                const { error } = await supabase
                    .from('bills')
                    .update(dbUpdates)
                    .eq('id', id);

                if (error) throw error;
            } else {
                const updatedBills = bills.map(b => b.id === id ? { ...b, ...updates } : b);
                await saveBillsToStorage(updatedBills);
            }
        } catch (err) {
            console.error('Error updating bill:', err);
            // Rollback
            setBillsState(prev => prev.map(b => b.id === id ? originalBill : b));
            setError('Failed to update bill.');
        }
    };

    const deleteBill = async (id: string) => {
        const billToDelete = bills.find(b => b.id === id);

        // Optimistic UI — remove from local state if present
        if (billToDelete) {
            setBillsState(prev => prev.filter(b => b.id !== id));
        }

        try {
            if (isSignedIn && user) {
                const { error } = await supabase
                    .from('bills')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } else if (billToDelete) {
                const updatedBills = bills.filter((b: Bill) => b.id !== id);
                await saveBillsToStorage(updatedBills);
            }
        } catch (err) {
            console.error('Error deleting bill:', err);
            // Rollback if we removed it optimistically
            if (billToDelete) {
                setBillsState(prev => [...prev, billToDelete]);
            }
            setError('Failed to delete bill.');
        }
    };

    const calculateNextDueDate = (bill: Bill): Date | null => {
        const currentDueDate = parseDate(bill.dueDate);
        let nextDueDate = new Date(currentDueDate);

        if (bill.dueDays && bill.dueDays.length > 0) {
            const sortedDays = [...bill.dueDays].sort((a, b) => a - b);
            const occurrence = bill.occurrence || 'Every Month';
            if (occurrence.includes('Week')) {
                const currentDay = currentDueDate.getDay();
                const nextDay = sortedDays.find(d => d > currentDay);
                if (nextDay !== undefined) {
                    nextDueDate.setDate(currentDueDate.getDate() + (nextDay - currentDay));
                } else {
                    nextDueDate.setDate(currentDueDate.getDate() + (7 - currentDay + sortedDays[0]));
                }
            } else {
                const currentDate = currentDueDate.getDate();
                const nextDay = sortedDays.find(d => d > currentDate);
                if (nextDay !== undefined) {
                    nextDueDate.setDate(nextDay);
                    if (nextDueDate.getDate() !== nextDay) nextDueDate.setDate(0);
                } else {
                    nextDueDate.setMonth(currentDueDate.getMonth() + 1);
                    nextDueDate.setDate(sortedDays[0]);
                    if (nextDueDate.getDate() !== sortedDays[0]) nextDueDate.setDate(0);
                }
            }
        } else {
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
                case 'Twice a Week':
                    nextDueDate.setDate(currentDueDate.getDate() + 3);
                    break;
                case 'Installments':
                    if (bill.installmentRecurrence === 'bi-weekly') {
                        nextDueDate.setDate(currentDueDate.getDate() + 14);
                    } else {
                        nextDueDate.setMonth(currentDueDate.getMonth() + 1);
                    }
                    break;
                case 'Every Quarter':
                    nextDueDate.setMonth(currentDueDate.getMonth() + 3);
                    break;
                case 'Every Year':
                    nextDueDate.setFullYear(currentDueDate.getFullYear() + 1);
                    break;
                default:
                    nextDueDate.setMonth(currentDueDate.getMonth() + 1);
            }
        }

        if (nextDueDate.getTime() !== currentDueDate.getTime()) {
            return nextDueDate;
        }
        return null;
    };

    const toggleBillStatus = async (id: string) => {
        const bill = bills.find((b: Bill) => b.id === id);
        if (!bill) return;

        const newIsPaid = !bill.isPaid;
        let updates: Partial<Bill> = { isPaid: newIsPaid };

        if (newIsPaid) {
            // Record the transaction
            await recordTransaction(bill, 'PAID');

            // Advance installments counter
            if (bill.occurrence === 'Installments') {
                const currentPaid = bill.paidInstallments || 0;
                const total = bill.totalInstallments || Infinity;
                if (currentPaid < total) {
                    updates.paidInstallments = currentPaid + 1;
                }
            }

            // For recurring bills, just mark as paid — don't advance yet.
            // The bill advances to the next cycle when Clear is toggled.
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
            updates.clearedDate = formatDate(new Date());
        } else {
            updates.clearedDate = undefined;
        }

        await updateBill(id, updates);
    };

    const resetAllStatuses = async () => {
        const updatedBills = bills.map((b: Bill) => ({ ...b, isPaid: false, isCleared: false, clearedDate: undefined }));
        setBillsState(updatedBills);

        try {
            if (isSignedIn && user) {
                const { error } = await supabase
                    .from('bills')
                    .update({
                        is_paid: false,
                        is_cleared: false,
                        cleared_date: null
                    })
                    .eq('user_id', user.id);

                if (error) throw error;
            } else {
                await saveBillsToStorage(updatedBills);
            }
        } catch (err) {
            console.error('Error resetting statuses:', err);
        }
    };

    const setBills = async (newBills: Bill[]) => {
        const updatedWithOrder = newBills.map((b, index) => ({ ...b, order: index }));
        setBillsState(updatedWithOrder);

        try {
            if (isSignedIn && user) {
                // Persist order to Supabase
                // We can use upsert if we provide IDs and user_id
                const dbBills = updatedWithOrder.map(b => ({
                    ...mapLocalBillToDb(b, user.id),
                    id: b.id // Ensure we keep the same ID
                }));

                const { error } = await supabase
                    .from('bills')
                    .upsert(dbBills);

                if (error) throw error;
            } else {
                await saveBillsToStorage(updatedWithOrder);
            }
        } catch (err) {
            console.error('Error setting bills/order:', err);
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
