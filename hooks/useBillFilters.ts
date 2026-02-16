import { useState, useMemo } from 'react';
import { usePreferences } from '../context/UserPreferencesContext';
import { getPayPeriodInterval } from '../utils/date';
import { FilterPeriod } from '../types';

/**
 * Shared filter state used by Home, Bills, and History screens.
 * Encapsulates period, month, category, and search state along with
 * the derived pay-period intervals.
 */
export function useBillFilters(defaultPeriod: FilterPeriod = 'all') {
    const { preferences } = usePreferences();

    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>(defaultPeriod);
    const [selectedMonth, setSelectedMonth] = useState(-1);
    const [showMonthMenu, setShowMonthMenu] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const intervals = useMemo(() => ({
        last: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, -1, preferences.payPeriodSemiMonthlyDays),
        this: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 0, preferences.payPeriodSemiMonthlyDays),
        next: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 1, preferences.payPeriodSemiMonthlyDays),
    }), [preferences.payPeriodStart, preferences.payPeriodOccurrence, preferences.payPeriodSemiMonthlyDays]);

    return {
        filterPeriod,
        setFilterPeriod,
        selectedMonth,
        setSelectedMonth,
        showMonthMenu,
        setShowMonthMenu,
        selectedCategory,
        setSelectedCategory,
        showCategoryMenu,
        setShowCategoryMenu,
        searchQuery,
        setSearchQuery,
        intervals,
        preferences,
    };
}

export type BillFilters = ReturnType<typeof useBillFilters>;
