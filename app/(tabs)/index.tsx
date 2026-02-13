import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text, Card, useTheme, Button, Avatar, Menu, Divider, Searchbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { useBills, Bill } from '../../context/BillContext';
import { usePreferences } from '../../context/UserPreferencesContext';
import { MONTHS, parseDate, getPayPeriodInterval } from '../../utils/date';
import { supabase } from '../../services/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { CATEGORIES, CATEGORY_ICONS } from '../../constants/categories';
import BillCard from '../../components/BillCard';

export interface Transaction {
    id: string;
    user_id: string;
    bill_id: string | null;
    title: string;
    amount: string;
    category: string;
    transaction_date: string;
    settlement_type: 'PAID' | 'CLEARED';
    notes?: string;
}

export default function HomeScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useUser();
    const { bills } = useBills();
    const { preferences } = usePreferences();
    const [filterPeriod, setFilterPeriod] = useState<'last' | 'this' | 'next' | 'all' | 'monthly'>('this');
    const [selectedMonth, setSelectedMonth] = useState(-1);
    const [showMonthMenu, setShowMonthMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Category Filter State
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);

    const currencySymbol = preferences.currency === 'EUR' ? '€' : '$';

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const intervals = useMemo(() => ({
        last: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, -1, preferences.payPeriodSemiMonthlyDays),
        this: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 0, preferences.payPeriodSemiMonthlyDays),
        next: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 1, preferences.payPeriodSemiMonthlyDays),
    }), [preferences.payPeriodStart, preferences.payPeriodOccurrence, preferences.payPeriodSemiMonthlyDays]);

    const fetchTransactions = async () => {
        if (!user) return;
        setLoadingTransactions(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('transaction_date', { ascending: false });

            if (error) throw error;
            if (data) setTransactions(data as Transaction[]);
        } catch (err) {
            console.error('[Home] Error fetching transactions:', err);
        } finally {
            setLoadingTransactions(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchTransactions();
        }, [user?.id])
    );

    // Unified logic: First filter bills by period AND search AND category, then derive stats
    const { upcomingBills, settledBills, totalDue, paidTotal } = useMemo(() => {
        // 1. Upcoming Bills: Derived from current bill states
        const upcoming = bills.filter((bill: Bill) => {
            if (bill.isPaid) return false;

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
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const currentYear = today.getFullYear();

            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) return true;
                if (billDate.getMonth() === selectedMonth && billDate.getFullYear() === currentYear) return true;
                if (bill.isRecurring) {
                    if (billDate.getFullYear() < currentYear) return true;
                    if (billDate.getFullYear() === currentYear && selectedMonth > billDate.getMonth()) return true;
                }
                return false;
            }

            const interval = intervals[filterPeriod as keyof typeof intervals];
            if (!interval) return false;
            if (billDate >= interval.start && billDate <= interval.end) return true;
            if (bill.isRecurring && interval.start > billDate) return true;

            return false;
        }).sort((a: Bill, b: Bill) => parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime());

        // 2. Settled Bills: Derived from Transactions for accuracy
        const settled = transactions.filter(t => {
            // Apply Search Filter
            if (searchQuery.length > 0 && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Apply Category Filter
            if (selectedCategory !== 'All' && t.category !== selectedCategory) {
                return false;
            }

            if (filterPeriod === 'all') return true;

            const tDate = new Date(t.transaction_date);
            const currentYear = new Date().getFullYear();

            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) return true;
                return tDate.getMonth() === selectedMonth && tDate.getFullYear() === currentYear;
            }

            const interval = intervals[filterPeriod as keyof typeof intervals];
            return tDate >= interval.start && tDate <= interval.end;
        });

        const due = upcoming.reduce((sum: number, bill: Bill) => sum + (parseFloat(bill.amount) || 0), 0);
        const paid = settled.reduce((sum: number, t: Transaction) => sum + (parseFloat(t.amount) || 0), 0);

        return { upcomingBills: upcoming, settledBills: settled, totalDue: due, paidTotal: paid };
    }, [filterPeriod, selectedMonth, intervals, bills, transactions, searchQuery, selectedCategory]);

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

                        <TouchableOpacity onPress={() => router.push('/profile')}>
                            <Avatar.Image size={48} source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=12' }} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Complete Profile Warning */}
                {user && user.name === 'User' && (
                    <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.8}>
                        <Card style={[styles.profileWarningCard, { backgroundColor: theme.colors.errorContainer }]}>
                            <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onErrorContainer }}>
                                        Complete your profile
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, marginTop: 4 }}>
                                        Set your name to personalize your experience.
                                    </Text>
                                </View>
                                <ChevronRight size={20} color={theme.colors.onErrorContainer} />
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                )}

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
                    upcomingBills.length > 0 ? upcomingBills.map((bill: Bill) => (
                        <BillCard
                            key={bill.id}
                            bill={bill}
                            filterPeriod={filterPeriod}
                            selectedMonth={selectedMonth}
                            upcomingReminderDays={preferences.upcomingReminderDays}
                            currencySymbol={currencySymbol}
                        />
                    )) : (
                        <View style={styles.emptyContainer}>
                            <IconButton icon="calendar-check" size={48} iconColor={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }}>
                                {searchQuery.length > 0 || selectedCategory !== 'All' ? 'No bills match your filters.' : 'No upcoming bills found!'}
                            </Text>
                            <Button
                                mode="contained"
                                onPress={() => router.push('/add-bill')}
                                icon="plus"
                                style={{ borderRadius: 12 }}
                            >
                                Add New Bill
                            </Button>
                        </View>
                    )
                }

                {
                    settledBills.length > 0 && (
                        <View style={{ marginTop: 24 }}>
                            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 12 }}>Settled</Text>
                            {settledBills.map((item: any) => (
                                <Card key={item.id} style={[styles.billCard, styles.settledCard]}>
                                    <Card.Title
                                        title={<Text variant="titleMedium" style={{ fontWeight: 'bold', textDecorationLine: 'line-through', opacity: 0.6 }}>{item.title}</Text>}
                                        subtitle={
                                            <View>
                                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6 }}>
                                                    Settled on {('transaction_date' in item) ? new Date(item.transaction_date).toLocaleDateString() : (item.clearedDate || item.dueDate)}
                                                </Text>
                                                <View style={[styles.categoryBadge, { opacity: 0.5 }]}>
                                                    <Text variant="labelSmall" style={styles.categoryText}>{item.category}</Text>
                                                </View>
                                            </View>
                                        }
                                        left={(props) => (
                                            <Avatar.Icon
                                                {...props}
                                                icon={CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || 'star'}
                                                style={{ backgroundColor: theme.colors.surfaceVariant, opacity: 0.5 }}
                                                color={theme.colors.onSurfaceVariant}
                                            />
                                        )}
                                        right={(props) => (
                                            <Text variant="titleMedium" style={{ marginRight: 16, opacity: 0.6, textDecorationLine: 'line-through' }}>
                                                {currencySymbol}{item.amount}
                                            </Text>
                                        )}
                                    />
                                </Card>
                            ))}
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
        marginTop: 12,
    },
    profileWarningCard: {
        marginBottom: 12,
        borderRadius: 16,
        elevation: 0,
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
        paddingTop: 8,
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
        padding: 24,
        alignItems: 'center',
    },
});
