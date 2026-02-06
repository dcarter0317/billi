import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Button, Avatar, Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBills, Bill } from '../../context/BillContext';
import { usePreferences } from '../../context/UserPreferencesContext';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Sync with bills.tsx logic (MM-DD-YYYY)
const parseDate = (dateStr: string) => {
    const [month, day, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};
const PAY_CYCLE_START = new Date(2026, 0, 26); // Jan 26, 2026
const getPayPeriodInterval = (offset = 0) => {
    const now = new Date(2026, 1, 5); // Feb 5, 2026
    const diff = now.getTime() - PAY_CYCLE_START.getTime();
    const daysSinceStart = Math.floor(diff / (1000 * 60 * 60 * 24));
    const periodsPassed = Math.floor(daysSinceStart / 14) + offset;

    const start = new Date(PAY_CYCLE_START);
    start.setDate(PAY_CYCLE_START.getDate() + (periodsPassed * 14));

    const end = new Date(start);
    end.setDate(start.getDate() + 13);

    return { start, end };
};

const getBillStatusColor = (bill: Bill, theme: any) => {
    if (bill.isPaid) {
        return theme.dark ? theme.colors.success : '#1B5E20'; // Darker Green in light mode
    }
    const today = new Date(2026, 1, 5);
    const dueDate = parseDate(bill.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) {
        return theme.dark ? theme.colors.error : '#B71C1C'; // Darker Red in light mode
    }
    return theme.dark ? (theme.colors as any).warning : '#E65100'; // Darker Amber/Orange in light mode
};

// interface Bill moved to Context

// INITIAL_BILLS moved to Context

export default function HomeScreen() {
    const theme = useTheme();
    const { bills } = useBills();
    const { preferences } = usePreferences();
    const [filterPeriod, setFilterPeriod] = useState<'last' | 'this' | 'next' | 'all' | 'monthly'>('this');
    const [selectedMonth, setSelectedMonth] = useState(-1);
    const [showMonthMenu, setShowMonthMenu] = useState(false);

    const currencySymbol = preferences.currency === 'EUR' ? '€' : '$';

    const intervals = useMemo(() => ({
        last: getPayPeriodInterval(-1),
        this: getPayPeriodInterval(0),
        next: getPayPeriodInterval(1),
    }), []);

    const upcomingBills = useMemo(() => {
        return bills
            .filter(bill => !bill.isPaid) // Only show unpaid on home
            .filter(bill => {
                if (filterPeriod === 'all') return true;

                const billDate = parseDate(bill.dueDate);
                if (filterPeriod === 'monthly') {
                    if (selectedMonth === -1) return true; // Show all for year if no month selected
                    return billDate.getMonth() === selectedMonth && billDate.getFullYear() === 2026;
                }

                const interval = intervals[filterPeriod as keyof typeof intervals];
                return billDate >= interval.start && billDate <= interval.end;
            })
            .sort((a, b) => parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime());
    }, [filterPeriod, selectedMonth, intervals, bills]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Header / Greeting */}
                <View style={styles.header}>
                    <View>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>Good Morning,</Text>
                        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Alex</Text>
                    </View>
                    <Avatar.Image size={48} source={{ uri: 'https://i.pravatar.cc/150?img=12' }} />
                </View>

                {/* Total Balance Card */}
                <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
                    <Card.Content>
                        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, opacity: 0.9 }}>Total Balance</Text>
                        <Text variant="displayMedium" style={{ fontWeight: 'bold', marginVertical: 8, color: theme.colors.onPrimary }}>
                            {currencySymbol}2,450.00
                        </Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                <Text variant="labelMedium" style={{ color: theme.colors.onPrimary }}>+ {currencySymbol}1,200 this month</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Up Next Section */}
                <View style={styles.sectionHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Up Next</Text>
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
                                            styles.filterChip,
                                            filterPeriod === 'monthly' && { backgroundColor: theme.colors.primaryContainer }
                                        ]}
                                    >
                                        <Text
                                            variant="labelSmall"
                                            style={[
                                                styles.filterChipText,
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
                                    {MONTHS.map((month, index) => (
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {(['last', 'this', 'next', 'all'] as const).map((period) => (
                                <TouchableOpacity
                                    key={period}
                                    onPress={() => setFilterPeriod(period)}
                                    style={[
                                        styles.filterChip,
                                        filterPeriod === period && { backgroundColor: theme.colors.primaryContainer }
                                    ]}
                                >
                                    <Text
                                        variant="labelSmall"
                                        style={[
                                            styles.filterChipText,
                                            { color: filterPeriod === period ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }
                                        ]}
                                    >
                                        {period === 'last' ? 'Last Pay Period' : period === 'this' ? 'Current Pay Period' : period === 'next' ? 'Next Pay Period' : 'All Bills'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {filterPeriod !== 'all' && filterPeriod !== 'monthly' && (
                    <Text variant="labelSmall" style={styles.helperText}>
                        Showing: {intervals[filterPeriod as keyof typeof intervals].start.toLocaleDateString()} - {intervals[filterPeriod as keyof typeof intervals].end.toLocaleDateString()}
                    </Text>
                )}

                {filterPeriod === 'monthly' && (
                    <Text variant="labelSmall" style={styles.helperText}>
                        Showing bills for {MONTHS[selectedMonth]} 2026
                    </Text>
                )}

                {upcomingBills.length > 0 ? upcomingBills.map(bill => (
                    <Card key={bill.id} style={styles.billCard}>
                        <Card.Title
                            title={bill.title}
                            subtitle={
                                <View>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Due {bill.dueDate}</Text>
                                    <View style={styles.categoryBadge}>
                                        <Text
                                            variant="labelSmall"
                                            style={[
                                                styles.categoryText,
                                                { color: getBillStatusColor(bill, theme) }
                                            ]}
                                        >
                                            {bill.category}
                                        </Text>
                                    </View>
                                </View>
                            }
                            left={(props) => (
                                <Avatar.Icon
                                    {...props}
                                    icon={bill.category === 'Entertainment' ? 'movie' : bill.category === 'Housing' ? 'home' : 'flash'}
                                    style={{ backgroundColor: bill.category === 'Entertainment' ? '#E50914' : bill.category === 'Housing' ? theme.colors.primary : (theme.colors as any).warning }}
                                />
                            )}
                            right={(props) => (
                                <Text variant="titleMedium" style={{ marginRight: 16 }}>
                                    {currencySymbol}{bill.amount}
                                </Text>
                            )}
                        />
                    </Card>
                )) : (
                    <View style={styles.emptyContainer}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            No bills found for the selected period.
                        </Text>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    balanceCard: {
        marginBottom: 24,
        borderRadius: 24,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    filterScroll: {
        marginBottom: 8,
    },
    filterChip: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    filterChipText: {
        textTransform: 'capitalize',
        fontWeight: 'bold',
    },
    helperText: {
        marginBottom: 16,
        opacity: 0.6,
        fontStyle: 'italic',
        fontSize: 10,
    },
    billCard: {
        marginBottom: 12,
        paddingBottom: 5,
    },
    categoryBadge: {
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    categoryText: {
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
    },
});
