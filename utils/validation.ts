import { formatDate, parseDate } from './date';
import { CATEGORIES } from '../constants/categories';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  hint?: string;
}

export function validateTitle(title: string): ValidationResult {
  if (!title || !title.trim()) {
    return {
      isValid: false,
      error: 'Title is required',
    };
  }
  if (title.length > 100) {
    return {
      isValid: false,
      error: 'Title must not exceed 100 characters',
    };
  }
  return { isValid: true };
}

export function validateAmount(amount: string): ValidationResult {
  if (!amount || !amount.trim()) {
    return {
      isValid: false,
      error: 'Amount is required',
    };
  }

  // Remove commas for parsing (e.g., "75,000" → "75000")
  const cleanAmount = amount.replace(/,/g, '');
  const parsedAmount = parseFloat(cleanAmount);
  if (isNaN(parsedAmount)) {
    return {
      isValid: false,
      error: 'Amount must be a valid number',
    };
  }

  if (parsedAmount < 0) {
    return {
      isValid: false,
      error: 'Amount must be positive',
    };
  }

  if (parsedAmount === 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than zero',
    };
  }

  // Check for multiple decimal points or too many decimal places
  const decimalCount = (cleanAmount.match(/\./g) || []).length;
  if (decimalCount > 1) {
    return {
      isValid: false,
      error: 'Max 2 decimal places',
    };
  }

  const decimalPlaces = (cleanAmount.split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: 'Max 2 decimal places',
    };
  }

  if (parsedAmount >= 50000) {
    return {
      isValid: true,
      hint: 'High amount; confirm this is correct',
    };
  }

  return { isValid: true };
}

export function validateDueDate(
  dueDate: Date,
  isNew: boolean
): ValidationResult {
  if (!dueDate) {
    return {
      isValid: false,
      error: 'Due date is required',
    };
  }

  // No date restriction; users can select any date (past or future)
  return { isValid: true };
}

export function validateCategory(category: string): ValidationResult {
  if (!category || !category.trim()) {
    return {
      isValid: false,
      error: 'Category is required',
    };
  }
  if (category.length > 100) {
    return {
      isValid: false,
      error: 'Category must not exceed 100 characters',
    };
  }
  return { isValid: true };
}

export function validateRecurrence(
  occurrence: string,
  dueDays: number[]
): ValidationResult {
  if (!occurrence) {
    return {
      isValid: false,
      error: 'Occurrence type is required',
    };
  }

  if (occurrence !== 'One Time' && dueDays.length === 0) {
    return {
      isValid: false,
      error: 'At least one due day is required for recurring bills',
    };
  }

  return { isValid: true };
}

export function validateInstallments(
  totalAmount: string,
  perAmount: string,
  paidCount: string,
  totalCount: string
): ValidationResult {
  if (!totalAmount || !perAmount) {
    return {
      isValid: false,
      error: 'Total amount and per-installment amount are required',
    };
  }

  const totalParsed = parseFloat(totalAmount);
  const perParsed = parseFloat(perAmount);
  const paidParsed = parseInt(paidCount || '0', 10);
  const totalParsed2 = parseInt(totalCount || '0', 10);

  if (isNaN(totalParsed) || totalParsed <= 0) {
    return {
      isValid: false,
      error: 'Total amount must be greater than zero',
    };
  }

  if (isNaN(perParsed) || perParsed <= 0) {
    return {
      isValid: false,
      error: 'Per-installment amount must be greater than zero',
    };
  }

  if (paidParsed > totalParsed2) {
    return {
      isValid: false,
      error: 'Paid installments cannot exceed total',
    };
  }

  return { isValid: true };
}

export function validateInstallmentDates(
  startDate: Date,
  endDate: string
): ValidationResult {
  if (!startDate || !endDate) {
    return {
      isValid: false,
      error: 'Start and end dates are required',
    };
  }

  const startFormatted = formatDate(startDate);
  const startObj = parseDate(startFormatted);
  const endObj = parseDate(endDate);

  if (endObj <= startObj) {
    return {
      isValid: false,
      error: 'End date must be after start date',
    };
  }

  return { isValid: true };
}

export function validateNotes(notes: string): ValidationResult {
  if (notes && notes.length > 500) {
    return {
      isValid: false,
      error: 'Notes must not exceed 500 characters',
    };
  }
  return { isValid: true };
}

interface BillFormData {
  title: string;
  amount: string;
  dueDate: Date;
  category: string;
  occurrence: string;
  dueDays: number[];
  notes: string;
  totalInstallmentAmount?: string;
  installmentAmount?: string;
  paidInstallments?: string;
  totalInstallments?: string;
  installmentStartDate?: Date;
  installmentEndDate?: string;
}

export function validateBillForm(
  bill: BillFormData,
  isNew: boolean
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const titleValidation = validateTitle(bill.title);
  if (!titleValidation.isValid && titleValidation.error) {
    errors.title = titleValidation.error;
  }

  const amountValidation = validateAmount(bill.amount);
  if (!amountValidation.isValid && amountValidation.error) {
    errors.amount = amountValidation.error;
  }

  const dueDateValidation = validateDueDate(bill.dueDate, isNew);
  if (!dueDateValidation.isValid && dueDateValidation.error) {
    errors.dueDate = dueDateValidation.error;
  }

  const categoryValidation = validateCategory(bill.category);
  if (!categoryValidation.isValid && categoryValidation.error) {
    errors.category = categoryValidation.error;
  }

  const recurrenceValidation = validateRecurrence(
    bill.occurrence,
    bill.dueDays
  );
  if (!recurrenceValidation.isValid && recurrenceValidation.error) {
    errors.occurrence = recurrenceValidation.error;
  }

  const notesValidation = validateNotes(bill.notes);
  if (!notesValidation.isValid && notesValidation.error) {
    errors.notes = notesValidation.error;
  }

  if (bill.occurrence === 'Installments') {
    const installmentsValidation = validateInstallments(
      bill.totalInstallmentAmount || '',
      bill.installmentAmount || '',
      bill.paidInstallments || '0',
      bill.totalInstallments || '0'
    );
    if (
      !installmentsValidation.isValid &&
      installmentsValidation.error
    ) {
      errors.installments = installmentsValidation.error;
    }

    if (bill.installmentStartDate && bill.installmentEndDate) {
      const datesValidation = validateInstallmentDates(
        bill.installmentStartDate,
        bill.installmentEndDate
      );
      if (!datesValidation.isValid && datesValidation.error) {
        errors.installmentDates = datesValidation.error;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
