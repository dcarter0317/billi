import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Button, Avatar, Menu, Divider, Searchbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBills, Bill } from '../../context/BillContext';
import { usePreferences } from '../../context/UserPreferencesContext';
import { MONTHS, parseDate, getPayPeriodInterval, getBillStatusColor } from '../../utils/date';

const CATEGORIES = [
    'Housing',
    'Utilities',
    'Food & Dining',
    'Transportation',
    'Entertainment',
    'Health & Fitness',
    'Shopping',
    'Insurance',
    'Personal Care',
    'Education',
    'Subscriptions',
    'Investments',
    'Debt & Loans',
    'Credit Card',
    'Student Loan',
    'Gifts & Donations',
    'Taxes',
    'Travel',
    'Pets',
    'Other',
    'Custom'
];

const CATEGORY_ICONS: Record<string, string> = {
    'Housing': 'home',
    'Utilities': 'flash',
    'Food & Dining': 'silverware-fork-knife',
    'Transportation': 'car',
    'Entertainment': 'movie',
    'Health & Fitness': 'heart-pulse',
    'Shopping': 'shopping',
    'Insurance': 'shield-check',
    'Personal Care': 'face-man',
    'Education': 'school',
    'Subscriptions': 'calendar-refresh',
    'Investments': 'trending-up',
    'Debt & Loans': 'bank',
    'Credit Card': 'credit-card',
    'Student Loan': 'school',
    'Gifts & Donations': 'gift',
    'Taxes': 'file-document-outline',
    'Travel': 'airplane',
    'Pets': 'paw',
    'Other': 'dots-horizontal',
    'Custom': 'star'
};

export default function HistoryScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { bills } = useBills();
    const { preferences } = usePreferences();
    const [filterPeriod, setFilterPeriod] = useState<'last' | 'this' | 'next' | 'all' | 'monthly'>('all');
    const [selectedMonth, setSelectedMonth] = useState(-1);
    const [showMonthMenu, setShowMonthMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Category Filter State
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);

    const currencySymbol = preferences.currency === 'EUR' ? '€' : '$';

    const intervals = useMemo(() => ({
        last: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, -1),
        this: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 0),
        next: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 1),
    }), [preferences.payPeriodStart, preferences.payPeriodOccurrence]);

    const { settledBills, paidTotal } = useMemo(() => {
        const pertinentBills = bills.filter(bill => {
            // Only show paid/cleared bills in History
            if (!bill.isPaid && !bill.isCleared) return false;

            // Apply Search Filter
            if (searchQuery.length > 0 && !bill.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Apply Category Filter
            if (selectedCategory !== 'All' && bill.category !== selectedCategory) {
                return false;
            }

            if (filterPeriod === 'all') return true;

            const billDate = parseDate(bill.dueDate);
            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) return true;
                return billDate.getMonth() === selectedMonth && billDate.getFullYear() === new Date().getFullYear();
            }

            const interval = intervals[filterPeriod as keyof typeof intervals];
            return billDate >= interval.start && billDate <= interval.end;
        });

        // settledBills are paid/cleared bills in this period
        const settled = pertinentBills
            .sort((a, b) => parseDate(b.dueDate).getTime() - parseDate(a.dueDate).getTime()); // Newest first

        const paid = settled.reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0);

        return { settledBills: settled, paidTotal: paid };
    }, [filterPeriod, selectedMonth, intervals, bills, searchQuery, selectedCategory]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Recent Activity</Text>
                </View>

                {/* Total Paid Card */}
                <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
                    <Card.Content>
                        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, opacity: 0.9 }}>
                            {searchQuery.length > 0 || selectedCategory !== 'All' ? 'Paid (Filtered)' : (filterPeriod === 'all' ? 'Total Paid (All Time)' : 'Paid (This Period)')}
                        </Text>
                        <Text variant="displayMedium" style={{ fontWeight: 'bold', marginVertical: 8, color: theme.colors.onPrimary }}>
                            {currencySymbol}{paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </Card.Content>
                </Card>

                <View style={styles.filterSection}>
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
                                            styles.filterChip,
                                            selectedCategory !== 'All' && { backgroundColor: theme.colors.primaryContainer }
                                        ]}
                                    >
                                        <Text
                                            variant="labelSmall"
                                            style={[
                                                styles.filterChipText,
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
                                    {(() => {
                                        if (period === 'all') return 'All Time';
                                        const isMonthly = preferences.payPeriodOccurrence === 'monthly';
                                        switch (period) {
                                            case 'last': return isMonthly ? 'Last Month' : 'Last Pay Period';
                                            case 'this': return isMonthly ? 'This Month' : 'Current Pay Period';
                                            case 'next': return isMonthly ? 'Next Month' : 'Next Pay Period';
                                            default: return period;
                                        }
                                    })()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Searchbar
                        placeholder="Search history"
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={styles.searchBar}
                        inputStyle={{ minHeight: 0 }}
                    />
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {settledBills.length > 0 ? settledBills.map(bill => (
                        <Card key={bill.id} style={[styles.billCard, styles.settledCard]}>
                            <Card.Title
                                title={bill.title}
                                titleStyle={{ opacity: 0.7 }}
                                subtitle={
                                    <View>
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}>
                                            Settled on {bill.clearedDate || bill.dueDate}
                                        </Text>
                                        <View style={[styles.categoryBadge, { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 }]}>
                                            <Text variant="labelSmall" style={styles.categoryText}>
                                                {bill.category}
                                            </Text>
                                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.3 }} />
                                            <Text variant="labelSmall" style={{ color: (theme.colors as any).success || theme.colors.primary, fontWeight: 'bold' }}>
                                                {bill.isCleared ? 'CLEARED' : 'PAID'}
                                            </Text>
                                        </View>
                                    </View>
                                }
                                left={(props) => (
                                    <Avatar.Icon
                                        {...props}
                                        icon={CATEGORY_ICONS[bill.category as keyof typeof CATEGORY_ICONS] || 'star'}
                                        style={{ backgroundColor: theme.colors.surfaceVariant, opacity: 0.5 }}
                                        color={theme.colors.onSurfaceVariant}
                                    />
                                )}
                                right={(props) => (
                                    <Text variant="titleMedium" style={{ marginRight: 16, opacity: 0.7, textDecorationLine: 'line-through' }}>
                                        {currencySymbol}{bill.amount}
                                    </Text>
                                )}
                            />
                        </Card>
                    )) : (
                        <View style={styles.emptyContainer}>
                            <IconButton icon="history" size={48} iconColor={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                                No transaction history found!
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginBottom: 24,
    },
    balanceCard: {
        marginBottom: 24,
        borderRadius: 24,
    },
    filterSection: {
        marginBottom: 16,
    },
    filterScroll: {
        marginBottom: 12,
    },
    searchBar: {
        height: 40,
        borderRadius: 12,
        marginBottom: 8,
        elevation: 0,
        backgroundColor: 'rgba(0,0,0,0.05)',
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
    billCard: {
        marginBottom: 12,
        paddingBottom: 5,
    },
    settledCard: {
        opacity: 0.8,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        elevation: 0,
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
        padding: 48,
        alignItems: 'center',
    },
});
