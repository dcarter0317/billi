import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Menu, Divider, Searchbar, useTheme } from 'react-native-paper';
import { MONTHS } from '../utils/date';
import { CATEGORIES } from '../constants/categories';
import { sharedStyles } from '../constants/sharedStyles';
import type { BillFilters } from '../hooks/useBillFilters';

interface FilterBarProps {
    /** The filter state object returned by useBillFilters() */
    filters: BillFilters;
    /** Label for the "all" period chip (e.g. "All Bills" or "All Time") */
    allLabel?: string;
    /** Placeholder for the search bar */
    searchPlaceholder?: string;
}

/**
 * Reusable filter bar: category dropdown, month dropdown, period chips, and search.
 * Used on Home, Bills, and History screens.
 */
export default function FilterBar({
    filters,
    allLabel = 'All Bills',
    searchPlaceholder = 'Search',
}: FilterBarProps) {
    const theme = useTheme();
    const {
        filterPeriod, setFilterPeriod,
        selectedMonth, setSelectedMonth,
        showMonthMenu, setShowMonthMenu,
        selectedCategory, setSelectedCategory,
        showCategoryMenu, setShowCategoryMenu,
        searchQuery, setSearchQuery,
        preferences,
    } = filters;

    const isMonthly = preferences.payPeriodOccurrence === 'monthly';

    const getPeriodLabel = (period: 'last' | 'this' | 'next' | 'all') => {
        if (period === 'all') return allLabel;
        switch (period) {
            case 'last': return isMonthly ? 'Last Month' : 'Last Pay Period';
            case 'this': return isMonthly ? 'This Month' : 'Current Pay Period';
            case 'next': return isMonthly ? 'Next Month' : 'Next Pay Period';
            default: return period;
        }
    };

    return (
        <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row' }}>
                    {/* Category Filter */}
                    <Menu
                        visible={showCategoryMenu}
                        onDismiss={() => setShowCategoryMenu(false)}
                        anchor={
                            <TouchableOpacity
                                onPress={() => setShowCategoryMenu(true)}
                                style={[
                                    sharedStyles.filterChip,
                                    selectedCategory !== 'All' && { backgroundColor: theme.colors.primaryContainer }
                                ]}
                            >
                                <Text
                                    variant="labelSmall"
                                    style={[
                                        sharedStyles.filterChipText,
                                        { color: selectedCategory !== 'All' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }
                                    ]}
                                >
                                    {selectedCategory === 'All' ? 'Category' : selectedCategory}
                                </Text>
                            </TouchableOpacity>
                        }
                    >
                        <ScrollView style={{ maxHeight: 300 }}>
                            <Menu.Item
                                onPress={() => {
                                    setSelectedCategory('All');
                                    setShowCategoryMenu(false);
                                }}
                                title="All Categories"
                                leadingIcon={selectedCategory === 'All' ? 'check' : undefined}
                            />
                            <Divider />
                            {CATEGORIES.map((cat) => (
                                <Menu.Item
                                    key={cat}
                                    onPress={() => {
                                        setSelectedCategory(cat);
                                        setShowCategoryMenu(false);
                                    }}
                                    title={cat}
                                    leadingIcon={selectedCategory === cat ? 'check' : undefined}
                                />
                            ))}
                        </ScrollView>
                    </Menu>

                    {/* Month Filter */}
                    <Menu
                        visible={showMonthMenu}
                        onDismiss={() => setShowMonthMenu(false)}
                        anchor={
                            <TouchableOpacity
                                onPress={() => {
                                    setFilterPeriod('monthly');
                                    setShowMonthMenu(true);
                                }}
                                style={[
                                    sharedStyles.filterChip,
                                    filterPeriod === 'monthly' && { backgroundColor: theme.colors.primaryContainer }
                                ]}
                            >
                                <Text
                                    variant="labelSmall"
                                    style={[
                                        sharedStyles.filterChipText,
                                        { color: filterPeriod === 'monthly' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }
                                    ]}
                                >
                                    {selectedMonth === -1 ? 'Select Month' : MONTHS[selectedMonth]}
                                </Text>
                            </TouchableOpacity>
                        }
                    >
                        <ScrollView style={{ maxHeight: 300 }}>
                            <Menu.Item
                                onPress={() => {
                                    setSelectedMonth(-1);
                                    setFilterPeriod('monthly');
                                    setShowMonthMenu(false);
                                }}
                                title="Select Month"
                                leadingIcon={selectedMonth === -1 ? 'check' : undefined}
                            />
                            <Divider />
                            {MONTHS.map((month: string, index: number) => (
                                <Menu.Item
                                    key={month}
                                    onPress={() => {
                                        setSelectedMonth(index);
                                        setFilterPeriod('monthly');
                                        setShowMonthMenu(false);
                                    }}
                                    title={month}
                                    leadingIcon={selectedMonth === index ? 'check' : undefined}
                                />
                            ))}
                        </ScrollView>
                    </Menu>
                </View>
            </View>

            {/* Period Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sharedStyles.filterScroll}>
                {(['last', 'this', 'next', 'all'] as const).map((period) => (
                    <TouchableOpacity
                        key={period}
                        onPress={() => setFilterPeriod(period)}
                        style={[
                            sharedStyles.filterChip,
                            filterPeriod === period && { backgroundColor: theme.colors.primaryContainer }
                        ]}
                    >
                        <Text
                            variant="labelSmall"
                            style={[
                                sharedStyles.filterChipText,
                                { color: filterPeriod === period ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }
                            ]}
                        >
                            {getPeriodLabel(period)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Search Bar */}
            <Searchbar
                placeholder={searchPlaceholder}
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={sharedStyles.searchBar}
                inputStyle={{ minHeight: 0 }}
            />
        </>
    );
}
