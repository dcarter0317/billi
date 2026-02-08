import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Button, Avatar, Menu, Divider, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
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

export default function HomeScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useUser();
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
        last: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodFrequency, -1),
        this: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodFrequency, 0),
        next: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodFrequency, 1),
    }), [preferences.payPeriodStart, preferences.payPeriodFrequency]);

    // Unified logic: First filter bills by period AND search AND category, then derive stats
    const { upcomingBills, totalDue, paidTotal } = useMemo(() => {
        const pertinentBills = bills.filter(bill => {
            // Apply Search Filter first
            if (searchQuery.length > 0 && !bill.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Apply Category Filter
            if (selectedCategory !== 'All' && bill.category !== selectedCategory) {
                // Note: If a custom category is used that isn't in the list, it won't match 'Custom' string unless the bill.category is literally 'Custom'.
                // Users usually replace 'Custom' with their own text. 
                // So selecting 'Custom' in dropdown effectively finds bills literally named 'Custom', which might be rare if they input a name.
                // But selecting standard categories works fine.
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

        // upcomingBills are unpaid bills in this period
        const upcoming = pertinentBills
            .filter(bill => !bill.isPaid)
            .sort((a, b) => parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime());

        // Calculate totals based on the filtered set
        const due = upcoming.reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0);

        // For 'all' view, we might want "Paid This Month" as context, 
        // but for specific periods, we want "Paid In Period".
        let paid = 0;

        // If searching or filtering by category, show exact matches for paid total too
        if (searchQuery.length > 0 || selectedCategory !== 'All') {
            paid = pertinentBills
                .filter(b => b.isPaid)
                .reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0);
        } else if (filterPeriod === 'all') {
            // For All view w/o search/category, stick to "Paid This Month" logic for relevance
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            paid = bills
                .filter(b => b.isPaid)
                .reduce((sum, bill) => {
                    const billDate = parseDate(bill.dueDate);
                    if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
                        return sum + (parseFloat(bill.amount) || 0);
                    }
                    return sum;
                }, 0);
        } else {
            // For specific periods, sum the paid bills IN that period
            paid = pertinentBills
                .filter(b => b.isPaid)
                .reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0);
        }

        return { upcomingBills: upcoming, totalDue: due, paidTotal: paid };
    }, [filterPeriod, selectedMonth, intervals, bills, searchQuery, selectedCategory]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header / Greeting */}
                <View style={styles.header}>
                    <View>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            {(() => {
                                const hour = new Date().getHours();
                                if (hour < 12) return 'Good Morning,';
                                if (hour < 18) return 'Good Afternoon,';
                                return 'Good Evening,';
                            })()}
                        </Text>
                        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>{user?.name?.split(' ')[0] || 'User'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/profile')}>
                        <Avatar.Image size={48} source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=12' }} />
                    </TouchableOpacity>
                </View>

                {/* Total Balance Card */}
                <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
                    <Card.Content>
                        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, opacity: 0.9 }}>
                            {searchQuery.length > 0 || selectedCategory !== 'All' ? 'Outstanding (Filtered)' : (filterPeriod === 'all' ? 'Total Outstanding' : 'Outstanding (This Period)')}
                        </Text>
                        <Text variant="displayMedium" style={{ fontWeight: 'bold', marginVertical: 8, color: theme.colors.onPrimary }}>
                            {currencySymbol}{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                <Text variant="labelMedium" style={{ color: theme.colors.onPrimary }}>
                                    + {currencySymbol}{paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {searchQuery.length > 0 || selectedCategory !== 'All' ? 'paid (filtered)' : (filterPeriod === 'all' ? 'paid this month' : 'paid in period')}
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Up Next Section */}
                <View style={styles.sectionHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Up Next</Text>

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
                                            if (period === 'all') return 'All Bills';
                                            const isMonthly = preferences.payPeriodFrequency === 'monthly';
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
                            placeholder="Search pending bills"
                            onChangeText={setSearchQuery}
                            value={searchQuery}
                            style={styles.searchBar}
                            inputStyle={{ minHeight: 0 }} // Fix for some paper versions
                        />

                    </View>
                </View>

                {
                    searchQuery.length === 0 && filterPeriod !== 'all' && filterPeriod !== 'monthly' && (
                        <Text variant="labelSmall" style={styles.helperText}>
                            Showing: {
                                (() => {
                                    const range = intervals[filterPeriod as keyof typeof intervals];
                                    if (!range || !range.start || isNaN(range.start.getTime())) return 'Invalid Period';
                                    return `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}`;
                                })()
                            }
                        </Text>
                    )
                }

                {
                    searchQuery.length === 0 && filterPeriod === 'monthly' && (
                        <Text variant="labelSmall" style={styles.helperText}>
                            Showing bills for {MONTHS[selectedMonth]} {new Date().getFullYear()}
                        </Text>
                    )
                }

                {
                    upcomingBills.length > 0 ? upcomingBills.map(bill => (
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
                                        icon={CATEGORY_ICONS[bill.category as keyof typeof CATEGORY_ICONS] || 'star'}
                                        style={{ backgroundColor: ['Housing', 'Utilities', 'Transportation'].includes(bill.category) ? theme.colors.primary : theme.colors.surfaceVariant }}
                                        color={['Housing', 'Utilities', 'Transportation'].includes(bill.category) ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
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
                                {searchQuery.length > 0 || selectedCategory !== 'All' ? 'No bills match your filters.' : 'No bills found for the selected period.'}
                            </Text>
                        </View>
                    )
                }

            </ScrollView >
        </SafeAreaView >
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
