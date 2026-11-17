import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBills, Bill } from '../context/BillContext';
import { parseDate } from '../utils/date';
import { CATEGORIES } from '../constants/categories';
import {
    validateTitle,
    validateAmount,
    validateCategory,
    validateNotes,
    validateBillForm,
} from '../utils/validation';
import {
    Occurrence,
    BillFormValues,
    buildBillPayload,
    calculateNextDueDate,
    calculateInstallmentEndDate,
} from '../utils/billForm';

type ValidatedField = 'title' | 'amount' | 'category' | 'notes';

/** State, validation and saving for the add and edit bill screen. */
export function useBillForm() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { addBill, updateBill, bills } = useBills();

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const isEdit = params.isEdit === 'true' && !!id;
    const editingBill = isEdit ? bills.find(b => b.id === id) : undefined;

    // Form fields
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [isCleared, setIsCleared] = useState(false);
    const [notes, setNotes] = useState('');
    const [occurrence, setOccurrence] = useState<Occurrence>('One Time');
    const [dueDays, setDueDays] = useState<number[]>([]);

    // Installment fields
    const [totalInstallments, setTotalInstallments] = useState('');
    const [paidInstallments, setPaidInstallments] = useState('0');
    const [installmentTotalAmount, setInstallmentTotalAmount] = useState('');
    const [installmentStartDate, setInstallmentStartDate] = useState(new Date());
    const [installmentEndDate, setInstallmentEndDate] = useState('');
    const [installmentRecurrence, setInstallmentRecurrence] = useState<Bill['installmentRecurrence']>('monthly');

    // Validation feedback
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [fieldHints, setFieldHints] = useState<Record<string, string>>({});
    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Save state and feedback
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>(
        { visible: false, message: '', type: 'success' },
    );
    const [recurrenceWarning, setRecurrenceWarning] = useState<{ oldType: string; newType: string } | null>(null);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const backTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fill the form when the bill being edited is found
    useEffect(() => {
        if (!editingBill) return;
        setTitle(editingBill.title || '');
        setAmount(editingBill.amount || '');
        setDate(editingBill.dueDate ? parseDate(editingBill.dueDate) : new Date());

        if (editingBill.category && !CATEGORIES.includes(editingBill.category)) {
            setCategory('Custom');
            setCustomCategory(editingBill.category);
        } else {
            setCategory(editingBill.category || 'Utilities');
            setCustomCategory('');
        }

        setIsPaid(editingBill.isPaid || false);
        setIsCleared(editingBill.isCleared || false);
        setOccurrence(editingBill.occurrence || 'Every Month');
        setDueDays(editingBill.dueDays || []);
        if (editingBill.totalInstallments != null) setTotalInstallments(editingBill.totalInstallments.toString());
        if (editingBill.paidInstallments != null) setPaidInstallments(editingBill.paidInstallments.toString());
        if (editingBill.totalInstallmentAmount) setInstallmentTotalAmount(editingBill.totalInstallmentAmount);
        if (editingBill.installmentStartDate) setInstallmentStartDate(parseDate(editingBill.installmentStartDate));
        if (editingBill.installmentEndDate) setInstallmentEndDate(editingBill.installmentEndDate);
        if (editingBill.installmentRecurrence) setInstallmentRecurrence(editingBill.installmentRecurrence);
        setNotes(editingBill.notes || '');
        // Keyed on the id so a background refresh does not wipe what the user is typing
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingBill?.id]);

    // Clear timers on unmount
    useEffect(() => () => {
        Object.values(debounceTimers.current).forEach(clearTimeout);
        if (backTimer.current) clearTimeout(backTimer.current);
    }, []);

    // Total installments from the total amount and the installment amount
    useEffect(() => {
        if (occurrence !== 'Installments') return;
        const total = parseFloat(installmentTotalAmount);
        const installment = parseFloat(amount);
        if (total > 0 && installment > 0) setTotalInstallments(Math.ceil(total / installment).toString());
    }, [installmentTotalAmount, amount, occurrence]);

    // Effective due date from the chosen days
    useEffect(() => {
        if (dueDays.length > 0) setDate(calculateNextDueDate(dueDays, occurrence));
    }, [dueDays, occurrence]);

    // Installment end date
    useEffect(() => {
        if (occurrence === 'Installments') {
            setInstallmentEndDate(calculateInstallmentEndDate(installmentStartDate, totalInstallments, installmentRecurrence));
        }
    }, [installmentStartDate, totalInstallments, installmentRecurrence, occurrence]);

    const validateField = useCallback((field: ValidatedField, value: string) => {
        clearTimeout(debounceTimers.current[field]);
        debounceTimers.current[field] = setTimeout(() => {
            const results: Record<ValidatedField, () => ReturnType<typeof validateTitle>> = {
                title: () => validateTitle(value),
                amount: () => validateAmount(value),
                category: () => validateCategory(value),
                notes: () => validateNotes(value),
            };
            const result = results[field]();
            setFieldErrors(prev => ({ ...prev, [field]: result.error || '' }));
            setFieldHints(prev => ({ ...prev, [field]: result.hint || '' }));
        }, 300);
    }, []);

    const changeTitle = (text: string) => {
        setTitle(text.slice(0, 100));
        validateField('title', text);
    };
    const changeAmount = (text: string) => {
        setAmount(text);
        validateField('amount', text);
    };
    const changeNotes = (text: string) => {
        setNotes(text.slice(0, 500));
        validateField('notes', text);
    };
    const changeCategory = (value: string) => {
        setCategory(value);
        validateField('category', value);
    };
    const changeOccurrence = (value: Occurrence) => {
        setOccurrence(value);
        setDueDays([]); // days from the old occurrence no longer apply
    };

    const showSnackbar = (message: string, type: 'success' | 'error') => setSnackbar({ visible: true, message, type });
    const dismissSnackbar = () => setSnackbar(prev => ({ ...prev, visible: false }));

    const finalCategory = category === 'Custom' ? customCategory : category;

    const values: BillFormValues = {
        title, amount, date, category: finalCategory, isPaid, isCleared, occurrence, dueDays, notes,
        totalInstallments, paidInstallments, installmentTotalAmount, installmentStartDate,
        installmentEndDate, installmentRecurrence,
    };

    const submit = async () => {
        setSaving(true);
        try {
            const payload = buildBillPayload(values, isEdit);
            if (isEdit && id) {
                await updateBill(id, payload);
                showSnackbar('Bill updated', 'success');
            } else {
                await addBill(payload);
                showSnackbar('Bill added', 'success');
            }
            backTimer.current = setTimeout(() => router.back(), 2000);
        } catch (error) {
            console.error('Failed to save bill:', error);
            showSnackbar('Failed to save bill', 'error');
        } finally {
            setSaving(false);
        }
    };

    const save = async () => {
        const validation = validateBillForm({
            title,
            amount,
            dueDate: date,
            category: finalCategory,
            occurrence,
            dueDays,
            notes,
            totalInstallmentAmount: occurrence === 'Installments' ? installmentTotalAmount : undefined,
            installmentAmount: occurrence === 'Installments' ? amount : undefined,
            paidInstallments: occurrence === 'Installments' ? paidInstallments : undefined,
            totalInstallments: occurrence === 'Installments' ? totalInstallments : undefined,
            installmentStartDate: occurrence === 'Installments' ? installmentStartDate : undefined,
            installmentEndDate: occurrence === 'Installments' ? installmentEndDate : undefined,
        }, !isEdit);

        if (!validation.isValid) {
            setFieldErrors(validation.errors);
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            const firstError = Object.values(validation.errors)[0];
            showSnackbar(firstError || 'Please fix the errors above', 'error');
            return;
        }

        const recurrenceChanged = editingBill && (
            editingBill.occurrence !== occurrence ||
            JSON.stringify(editingBill.dueDays) !== JSON.stringify(dueDays)
        );
        if (recurrenceChanged) {
            setRecurrenceWarning({ oldType: editingBill.occurrence || '', newType: occurrence });
            return;
        }

        await submit();
    };

    const confirmRecurrenceChange = async () => {
        setRecurrenceWarning(null);
        await submit();
    };

    const cancelRecurrenceChange = () => {
        setRecurrenceWarning(null);
        setOccurrence(editingBill?.occurrence || 'One Time');
        setDueDays(editingBill?.dueDays || []);
    };

    return {
        isEdit,
        scrollViewRef,
        saving,
        snackbar,
        dismissSnackbar,
        recurrenceWarning,
        fieldErrors,
        fieldHints,
        validateField,
        // fields
        title, changeTitle,
        amount, changeAmount,
        notes, changeNotes,
        category, changeCategory,
        customCategory, setCustomCategory,
        occurrence, changeOccurrence,
        dueDays, setDueDays,
        date,
        isPaid, setIsPaid,
        isCleared, setIsCleared,
        totalInstallments, setTotalInstallments,
        paidInstallments, setPaidInstallments,
        installmentTotalAmount, setInstallmentTotalAmount,
        installmentStartDate, setInstallmentStartDate,
        installmentEndDate,
        installmentRecurrence, setInstallmentRecurrence,
        // actions
        save,
        confirmRecurrenceChange,
        cancelRecurrenceChange,
        goBack: () => router.back(),
    };
}
