import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text, Card, useTheme, Button, Avatar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { useBills, Bill } from '../../context/BillContext';
import { MONTHS, parseDate, formatDate, getBillOccurrencesInInterval } from '../../utils/date';
import { supabase } from '../../services/supabase';
import { getCurrencySymbol } from '../../utils/currency';
import { useFocusEffect } from '@react-navigation/native';
import BillCard from '../../components/BillCard';
import FilterBar from '../../components/FilterBar';
import { useBillFilters } from '../../hooks/useBillFilters';
import { Transaction } from '../../types';
import { sharedStyles } from '../../constants/sharedStyles';

export default function HomeScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user } = useUser();
    const { bills } = useBills();
    const filters = useBillFilters('this');
    const { filterPeriod, selectedMonth, searchQuery, selectedCategory, intervals, preferences } = filters;
    const currencySymbol = getCurrencySymbol(preferences.currency);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

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
        const upcoming: Bill[] = [];
        
        bills.forEach((bill: Bill) => {
            if (bill.isPaid || bill.isCleared) {
                return;
            }
            if (searchQuery.length > 0 && !bill.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return;
            }
            if (selectedCategory !== 'All' && bill.category !== selectedCategory) {
                return;
            }

            if (filterPeriod === 'all') {
                upcoming.push(bill);
                return;
            }

            const currentYear = new Date().getFullYear();

            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) {
                    upcoming.push(bill);
                    return;
                }
                
                // For monthly, we use the same "projection" logic
                const monthStart = new Date(currentYear, selectedMonth, 1);
                const monthEnd = new Date(currentYear, selectedMonth + 1, 0);
                const occurrences = getBillOccurrencesInInterval(bill, monthStart, monthEnd);
                
                occurrences.forEach(occDate => {
                    upcoming.push({
                        ...bill,
                        dueDate: formatDate(occDate)
                    });
                });
                return;
            }

            const interval = intervals[filterPeriod as keyof typeof intervals];
            if (!interval) return;

            const occurrences = getBillOccurrencesInInterval(bill, interval.start, interval.end);
            occurrences.forEach(occDate => {
                upcoming.push({
                    ...bill,
                    dueDate: formatDate(occDate)
                });
            });
        });

        // Unique by ID + Due Date (in case of weekly bills showing twice)
        const sortedUpcoming = upcoming.sort((a: Bill, b: Bill) => parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime());

        const settled = transactions.filter(t => {
            if (searchQuery.length > 0 && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
            if (filterPeriod === 'all') return true;

            const tDate = parseDate(t.transaction_date);
            const currentYear = new Date().getFullYear();
            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) return true;
                return tDate.getMonth() === selectedMonth && tDate.getFullYear() === currentYear;
            }
            const interval = intervals[filterPeriod as keyof typeof intervals];
            return tDate >= interval.start && tDate <= interval.end;
        });

        const due = sortedUpcoming.reduce((sum: number, bill: Bill) => sum + (parseFloat(bill.amount) || 0), 0);
        const paid = settled.reduce((sum: number, t: Transaction) => sum + (parseFloat(t.amount) || 0), 0);

        let paidLabel = 'paid';
        switch (filterPeriod) {
            case 'all':
                paidLabel = 'paid (all time)';
                break;
            case 'this':
                paidLabel = 'paid this month';
                break;
            case 'last':
                paidLabel = 'paid last month';
                break;
            case 'next':
                paidLabel = 'paid next month';
                break;
            default:
                paidLabel = 'paid';
        }
        return { upcomingBills: sortedUpcoming, settledBills: settled, totalDue: due, paidTotal: paid, paidLabel };
    }, [filterPeriod, selectedMonth, intervals, bills, transactions, searchQuery, selectedCategory]);

    const isFiltered = searchQuery.length > 0 || selectedCategory !== 'All';

    return (
        <SafeAreaView style={[sharedStyles.container, { backgroundColor: theme.colors.background }]}>
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
                            {isFiltered ? 'Outstanding (Filtered)' : (filterPeriod === 'all' ? 'Total Outstanding' : 'Outstanding (This Period)')}
                        </Text>
                        <Text variant="displayMedium" style={{ fontWeight: 'bold', marginVertical: 8, color: theme.colors.onPrimary }}>
                            {currencySymbol}{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}> 
                                <Text variant="labelMedium" style={{ color: theme.colors.onPrimary }}>
                                    + {currencySymbol}{paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isFiltered ? 'paid (filtered)' : paidLabel}
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
                        </View>

                        <FilterBar
                            filters={filters}
                            allLabel="All Bills"
                            searchPlaceholder="Search pending bills"
                        />
                    </View>
                </View>

                {searchQuery.length === 0 && filterPeriod !== 'all' && filterPeriod !== 'monthly' && (
                    <Text variant="labelSmall" style={styles.helperText}>
                        Showing: {(() => {
                            const range = intervals[filterPeriod as keyof typeof intervals];
                            return `${formatDate(range.start)} - ${formatDate(range.end)}`;
                        })()}
                    </Text>
                )}

                {searchQuery.length === 0 && filterPeriod === 'monthly' && selectedMonth >= 0 && (
                    <Text variant="labelSmall" style={styles.helperText}>
                        Showing bills for {MONTHS[selectedMonth]} {new Date().getFullYear()}
                    </Text>
                )}

                {upcomingBills.length > 0 ? upcomingBills.map((bill: Bill) => (
                    <BillCard
                        key={`${bill.id}-${bill.dueDate}`}
                        bill={bill}
                        filterPeriod={filterPeriod}
                        selectedMonth={selectedMonth}
                        upcomingReminderDays={preferences.upcomingReminderDays}
                        currencySymbol={currencySymbol}
                    />
                )) : (
                    <View style={sharedStyles.emptyContainer}>
                        <IconButton icon="calendar-check" size={48} iconColor={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }}>
                            {isFiltered ? 'No bills match your filters.' : 'No upcoming bills found!'}
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
                )}

            </ScrollView >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
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
});
