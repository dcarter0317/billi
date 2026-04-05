import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseDate, formatDate, calculateNextDueDate } from '../utils/date';
import { getCurrencySymbol, formatAmount } from '../utils/currency';
import { supabase } from '../services/supabase';
import { useUser } from './UserContext';

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
    // paymentHistory removed; use transactions table instead
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
    toggleBillStatus: (id: string, providedDueDate?: string) => Promise<void>;
    toggleClearStatus: (id: string, providedDueDate?: string) => Promise<void>;
    resetAllStatuses: () => Promise<void>;
    setBills: (bills: Bill[]) => Promise<void>;
    refreshBills: () => Promise<void>;
    deletePaymentRecord: (billId: string, recordId: string) => Promise<void>;
}

const BillContext = createContext<BillContextType | undefined>(undefined);

const STORAGE_KEY = 'billi_bills_data';

export function BillProvider({ children }: { children: ReactNode }) {

    const [bills, setBillsState] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user, isSignedIn, isLoaded } = useUser();

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
        occurrence: string | null;
        due_days: number[] | null;
        total_installments: number | null;
        paid_installments: number | null;
        is_recurring: boolean;
        notes: string | null;
        total_installment_amount: number | null;
        installment_start_date: string | null;
        installment_end_date: string | null;
        installment_recurrence: string | null;
        remaining_balance: number | null;
    }

    const formatOptionalAmount = (value: number | null | undefined): string | undefined => {
        if (value === null || value === undefined) return undefined;
        return formatAmount(value);
    };
    const mapDbBillToLocal = (dbBill: DbBill): Bill => ({
        id: dbBill.id,
        title: dbBill.title,
        amount: formatAmount(dbBill.amount),
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
        notes: dbBill.notes || '',
        totalInstallmentAmount: formatOptionalAmount(dbBill.total_installment_amount),
        installmentStartDate: dbBill.installment_start_date ? formatDate(parseDate(dbBill.installment_start_date)) : undefined,
        installmentEndDate: dbBill.installment_end_date ? formatDate(parseDate(dbBill.installment_end_date)) : undefined,
        installmentRecurrence: (dbBill.installment_recurrence as Bill['installmentRecurrence']) ?? undefined,
        remainingBalance: formatOptionalAmount(dbBill.remaining_balance),
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
        if (bill.totalInstallmentAmount !== undefined) db.total_installment_amount = bill.totalInstallmentAmount ? parseFloat(bill.totalInstallmentAmount) : null;
        if (bill.installmentStartDate !== undefined) db.installment_start_date = bill.installmentStartDate ? toDbDate(bill.installmentStartDate) : null;
        if (bill.installmentEndDate !== undefined) db.installment_end_date = bill.installmentEndDate ? toDbDate(bill.installmentEndDate) : null;
        if (bill.installmentRecurrence !== undefined) db.installment_recurrence = bill.installmentRecurrence;
        if (bill.remainingBalance !== undefined) db.remaining_balance = bill.remainingBalance ? parseFloat(bill.remainingBalance) : null;
        return db;
    };

    const refreshBills = async () => {
        if (!isLoaded || (isSignedIn && !user)) {
            return;
        }
        setLoading(true);
        try {
            if (isSignedIn && user) {
                await waitForInitialization();
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
        } catch (err: any) {
            console.error('Error loading bills detail:', err.message, err.code, err);
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

            await waitForInitialization();
            const { data: existingRows, error: fetchError } = await supabase
                .from('transactions')
                .select('id, settlement_type')
                .eq('bill_id', bill.id)
                .gte('transaction_date', today)
                .limit(1);

            const existing = existingRows?.[0] ?? null;

            if (fetchError) throw fetchError;

            if (existing) {
                await waitForInitialization();
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
                await waitForInitialization();
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
    }, [isLoaded, isSignedIn, user?.id]);

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
                await waitForInitialization();
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
                await waitForInitialization();
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
                await waitForInitialization();
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




    const toggleBillStatus = async (id: string, providedDueDate?: string) => {
        const bill = bills.find((b: Bill) => b.id === id);
        if (!bill) return;

        const isVirtual = providedDueDate && providedDueDate !== bill.dueDate;

        // If it's a virtual occurrence from the future, we "realize" it by advancing the bill first
        if (isVirtual) {
            const nextDate = parseDate(providedDueDate);
            await updateBill(id, {
                dueDate: formatDate(nextDate),
                isPaid: false,
                isCleared: false,
                clearedDate: undefined
            });
            // Recursively call for the newly advanced bill
            return toggleBillStatus(id);
        }

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
        } else {
            // If untoggling "Paid", we should decrement the installment counter if applicable
            if (bill.occurrence === 'Installments') {
                const currentPaid = bill.paidInstallments || 0;
                if (currentPaid > 0) {
                    updates.paidInstallments = currentPaid - 1;
                }
            }
        }

        await updateBill(id, updates);
    };

    // Deletes a payment record from the transactions table for the given bill
    const deletePaymentRecord = async (billId: string, recordId: string) => {
        try {
            await waitForInitialization();
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', recordId)
                .eq('bill_id', billId);
            if (error) throw error;
            // Optionally, refresh bills or transactions if needed
            await refreshBills();
        } catch (err) {
            console.error('Error deleting payment record:', err);
        }
    };

    const toggleClearStatus = async (id: string, providedDueDate?: string) => {
        const bill = bills.find((b: Bill) => b.id === id);
        if (!bill) return;

        const isVirtual = providedDueDate && providedDueDate !== bill.dueDate;

        if (isVirtual) {
            const nextDate = parseDate(providedDueDate);
            await updateBill(id, {
                dueDate: formatDate(nextDate),
                isPaid: false,
                isCleared: false,
                clearedDate: undefined
            });
            return toggleClearStatus(id);
        }

        const newIsCleared = !bill.isCleared;
        let updates: Partial<Bill> = { isCleared: newIsCleared };

        if (newIsCleared) {
            await recordTransaction(bill, 'CLEARED');
            updates.clearedDate = formatDate(new Date());

            // NOTE: Auto-advancement removed here. 
            // The bill stays on the current month as Paid/Cleared until 
            // 1. The user interacts with the NEXT month (handled by isVirtual above)
            // 2. The user resets statuses.
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
                await waitForInitialization();
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

                await waitForInitialization();
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
