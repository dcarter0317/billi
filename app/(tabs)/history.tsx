import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, useTheme, Avatar, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useBills, Bill } from '../../context/BillContext';
import { parseDate, formatDate } from '../../utils/date';
import { supabase } from '../../services/supabase';
import { useUser } from '../../context/UserContext';
import { CATEGORY_ICONS } from '../../constants/categories';
import { getCurrencySymbol } from '../../utils/currency';
import FilterBar from '../../components/FilterBar';
import { useBillFilters } from '../../hooks/useBillFilters';
import { Transaction } from '../../types';
import { sharedStyles } from '../../constants/sharedStyles';

export default function HistoryScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { bills, deleteBill } = useBills();
    const { user, isSignedIn } = useUser();
    const filters = useBillFilters('all');
    const { filterPeriod, selectedMonth, searchQuery, selectedCategory, intervals, preferences } = filters;
    const currencySymbol = getCurrencySymbol(preferences.currency);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTransactions = async () => {
        if (!isSignedIn || !user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('transaction_date', { ascending: false });

            if (error) {
                console.error('Error fetching transactions detail:', error.message, error.code, error);
                throw error;
            }
            if (data) setTransactions(data as Transaction[]);
        } catch (err: any) {
            console.error('Error fetching transactions exception:', err.message, err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchTransactions();
        }, [isSignedIn, user])
    );

    const { settledBills, paidTotal } = useMemo(() => {
        let source: (Transaction | Bill)[] = [];
        if (isSignedIn && user) {
            // Merge transactions with bills that are marked as paid/cleared but don't have a transaction record
            const billTransactionIds = new Set(transactions.map(t => t.bill_id).filter(Boolean));
            const missingPaidBills = bills.filter(b => (b.isPaid || b.isCleared) && !billTransactionIds.has(b.id));
            source = [...transactions, ...missingPaidBills];
        } else {
            source = bills.filter(b => b.isPaid || b.isCleared);
        }

        const pertinent = source.filter(item => {
            const isTransaction = 'transaction_date' in item;
            const title = item.title;
            const category = item.category;
            const dateStr = isTransaction ? (item as Transaction).transaction_date : (item as Bill).dueDate;

            if (searchQuery.length > 0 && !title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (selectedCategory !== 'All' && category !== selectedCategory) return false;
            if (filterPeriod === 'all') return true;

            const date = parseDate(dateStr);
            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) return true;
                return date.getMonth() === selectedMonth && date.getFullYear() === new Date().getFullYear();
            }

            const interval = intervals[filterPeriod as keyof typeof intervals];
            return date >= interval.start && date <= interval.end;
        });

        const sorted = pertinent.sort((a, b) => {
            const dateA = parseDate('transaction_date' in a ? a.transaction_date : a.dueDate).getTime();
            const dateB = parseDate('transaction_date' in b ? b.transaction_date : b.dueDate).getTime();
            return dateB - dateA;
        });

        const total = sorted.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        return { settledBills: sorted, paidTotal: total };
    }, [filterPeriod, selectedMonth, intervals, bills, transactions, searchQuery, selectedCategory, isSignedIn, user]);

    const isFiltered = searchQuery.length > 0 || selectedCategory !== 'All';

    return (
        <SafeAreaView style={[sharedStyles.container, { backgroundColor: theme.colors.background }]}>
            <View style={sharedStyles.content}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Recent Activity</Text>
                </View>

                {/* Total Paid Card */}
                <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
                    <Card.Content>
                        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, opacity: 0.9 }}>
                            {isFiltered ? 'Paid (Filtered)' : (filterPeriod === 'all' ? 'Total Paid (All Time)' : 'Paid (This Period)')}
                        </Text>
                        <Text variant="displayMedium" style={{ fontWeight: 'bold', marginVertical: 8, color: theme.colors.onPrimary }}>
                            {currencySymbol}{paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </Card.Content>
                </Card>

                <View style={styles.filterSection}>
                    <FilterBar
                        filters={filters}
                        allLabel="All Time"
                        searchPlaceholder="Search history"
                    />
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {loading && transactions.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text variant="bodyMedium" style={{ marginTop: 16, opacity: 0.6 }}>Fetching history...</Text>
                        </View>
                    ) : settledBills.length > 0 ? settledBills.map((item: any) => (
                        <Card key={item.id} style={[styles.billCard, sharedStyles.settledCard]}>
                            <Card.Title
                                title={item.title}
                                titleStyle={{ opacity: 0.7 }}
                                subtitle={
                                    <View>
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}>
                                            Settled on {('transaction_date' in item) ? formatDate(new Date(item.transaction_date)) : (formatDate(parseDate((item as Bill).clearedDate || (item as Bill).dueDate)))}
                                        </Text>
                                        <View style={[sharedStyles.categoryBadge, { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 }]}>
                                            <Text variant="labelSmall" style={sharedStyles.categoryText}>
                                                {item.category}
                                            </Text>
                                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.3 }} />
                                            <Text variant="labelSmall" style={{ color: (theme.colors as any).success || theme.colors.primary, fontWeight: 'bold' }}>
                                                {('settlement_type' in item) ? (item as Transaction).settlement_type : ((item as Bill).isCleared ? 'CLEARED' : 'PAID')}
                                            </Text>
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text variant="titleMedium" style={{ opacity: 0.7, textDecorationLine: 'line-through' }}>
                                            {currencySymbol}{item.amount}
                                        </Text>
                                        {item.bill_id && (
                                            <IconButton
                                                icon="delete-outline"
                                                size={20}
                                                iconColor={theme.colors.error}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Delete Bill',
                                                        `Are you sure you want to delete "${item.title}"? This will remove the bill and all its transaction history.`,
                                                        [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            {
                                                                text: 'Delete',
                                                                style: 'destructive',
                                                                onPress: async () => {
                                                                    try {
                                                                        await supabase
                                                                            .from('transactions')
                                                                            .delete()
                                                                            .eq('bill_id', item.bill_id);
                                                                        await deleteBill(item.bill_id);
                                                                        fetchTransactions();
                                                                    } catch (err) {
                                                                        console.error('Error deleting:', err);
                                                                    }
                                                                },
                                                            },
                                                        ]
                                                    );
                                                }}
                                            />
                                        )}
                                    </View>
                                )}
                            />
                        </Card>
                    )) : (
                        <View style={sharedStyles.emptyContainer}>
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
    billCard: {
        marginBottom: 12,
        paddingBottom: 5,
    },
    loadingContainer: {
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
