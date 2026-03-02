import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Text, Card, useTheme, FAB, IconButton, Checkbox, Button, Portal, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator
} from 'react-native-draggable-flatlist';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';

import { useBills, Bill } from '../../context/BillContext';
import { MONTHS, parseDate, getBillStatusColor, getBillAlertStatus, formatDate, getRecurringDueDateForMonth } from '../../utils/date';
import { getCurrencySymbol } from '../../utils/currency';
import { CATEGORY_ICONS } from '../../constants/categories';
import { useIsFocused } from '@react-navigation/native';
import FilterBar from '../../components/FilterBar';
import { useBillFilters } from '../../hooks/useBillFilters';
import { sharedStyles } from '../../constants/sharedStyles';

export default function BillsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const isFocused = useIsFocused();
    const { bills, setBills, deleteBill: contextDeleteBill, toggleBillStatus, toggleClearStatus, resetAllStatuses } = useBills();
    const filters = useBillFilters('all');
    const { filterPeriod, selectedMonth, searchQuery, selectedCategory, statusFilter, intervals, preferences, setSelectedMonth } = filters;
    const currencySymbol = getCurrencySymbol(preferences.currency);

    const deleteBill = (id: string) => {
        Alert.alert(
            "Delete Bill",
            "Are you sure you want to remove this bill? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => contextDeleteBill(id)
                }
            ]
        );
    };

    const handleReset = () => {
        Alert.alert(
            "Reset All Statuses",
            "This will mark all bills as 'PAY' and uncheck all 'Payment Cleared' boxes. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        resetAllStatuses();
                        setSelectedMonth(-1);
                    }
                }
            ]
        );
    };

    const filteredBills = useMemo(() => {
        const matchesCategory = (bill: Bill) =>
            selectedCategory === 'All' || bill.category === selectedCategory;

        const matchesStatus = (bill: Bill) => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'paid') return bill.isPaid || bill.isCleared;
            if (statusFilter === 'unpaid') return !bill.isPaid && !bill.isCleared;
            return true;
        };

        if (filterPeriod === 'monthly') {
            if (selectedMonth === -1) return bills.filter(bill => matchesCategory(bill) && matchesStatus(bill));

            const currentYear = new Date().getFullYear();

            return bills.reduce((acc: Bill[], bill) => {
                const matchesSearch = bill.title.toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchesSearch) return acc;
                if (!matchesCategory(bill)) return acc;
                if (!matchesStatus(bill)) return acc;

                const billDate = parseDate(bill.dueDate);
                if (billDate.getMonth() === selectedMonth && billDate.getFullYear() === currentYear) {
                    acc.push(bill);
                    return acc;
                }

                const recurringDueDate = getRecurringDueDateForMonth(bill, selectedMonth, currentYear);
                if (recurringDueDate) {
                    acc.push({
                        ...bill,
                        dueDate: formatDate(recurringDueDate),
                        isPaid: false,
                        isCleared: false,
                        clearedDate: undefined
                    });
                }

                return acc;
            }, []);
        }

        return bills.filter(bill => {
            const matchesSearch = bill.title.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
            if (!matchesCategory(bill)) return false;
            if (!matchesStatus(bill)) return false;

            if (filterPeriod === 'all') return true;

            const billDate = parseDate(bill.dueDate);
            const interval = intervals[filterPeriod as keyof typeof intervals];
            if (!interval) return false;

            if (billDate >= interval.start && billDate <= interval.end) return true;

            if (bill.isRecurring && interval.start > billDate) return true;

            return false;
        });
    }, [bills, searchQuery, filterPeriod, selectedMonth, intervals, selectedCategory, statusFilter]);

    const paidTotal = useMemo(() => {
        return filteredBills
            .filter(b => b.isPaid)
            .reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0)
            .toFixed(2);
    }, [filteredBills]);

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Bill>) => (
        <ScaleDecorator>
            <GHTouchableOpacity
                onLongPress={drag}
                disabled={isActive || searchQuery.length > 0 || filterPeriod !== 'all' || statusFilter !== 'all' || selectedCategory !== 'All'}
                activeOpacity={1}
            >
                <Card style={[
                    styles.card,
                    isActive && { backgroundColor: theme.colors.surfaceVariant, elevation: 8 },
                    (item.isPaid || item.isCleared) && sharedStyles.settledCard
                ]}>
                    <Card.Content style={styles.cardContent}>
                        <Avatar.Icon
                            size={40}
                            icon={CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || 'star'}
                            style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: 12 }}
                            color={theme.colors.onSurfaceVariant}
                        />
                        <View style={styles.cardLeft}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.title}</Text>
                                {(() => {
                                    const alertStatus = getBillAlertStatus(item.dueDate, preferences.upcomingReminderDays);
                                    if (alertStatus === 'none' || item.isPaid || item.isCleared) return null;

                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const dueDate = parseDate(item.dueDate);
                                    dueDate.setHours(0, 0, 0, 0);
                                    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                    return (
                                        <View style={[
                                            styles.alertBadge,
                                            { backgroundColor: alertStatus === 'overdue' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(245, 124, 0, 0.1)' }
                                        ]}>
                                            <Text variant="labelSmall" style={[
                                                styles.alertText,
                                                { color: alertStatus === 'overdue' ? '#D32F2F' : '#F57C00' }
                                            ]}>
                                                {alertStatus === 'overdue' ? 'OVERDUE' : `DUE IN ${diffDays} ${diffDays === 1 ? 'DAY' : 'DAYS'}`}
                                            </Text>
                                        </View>
                                    );
                                })()}
                            </View>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                Due {item.dueDate}
                                {item.occurrence === 'Installments' && item.paymentHistory && item.paymentHistory.length > 0 && (
                                    <Text style={{ color: (theme.colors as any).success || theme.colors.primary }}>
                                        {' • '}Last paid: {item.paymentHistory[item.paymentHistory.length - 1].date}
                                    </Text>
                                )}
                            </Text>
                            <View style={[sharedStyles.categoryBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                <Text variant="labelSmall" style={sharedStyles.categoryText}>{item.category}</Text>
                                {item.occurrence === 'Installments' && item.totalInstallments && (
                                    <>
                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.3 }} />
                                        <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                            {item.paidInstallments || 0} of {item.totalInstallments} payments made
                                        </Text>
                                    </>
                                )}
                            </View>
                            {item.isRecurring && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <IconButton icon="repeat" size={14} style={{ margin: 0 }} iconColor={theme.colors.primary} />
                                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Recurring</Text>
                                </View>
                            )}
                            {item.notes ? (
                                <Text variant="bodySmall" numberOfLines={1} style={{ marginTop: 4, fontStyle: 'italic', opacity: 0.7 }}>
                                    Note: {item.notes}
                                </Text>
                            ) : null}

                        </View>
                        <View style={styles.cardRight}>
                            <View style={styles.amountRow}>
                                <Text variant="titleMedium" style={{ marginRight: 8 }}>{currencySymbol}{item.amount}</Text>
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    iconColor={theme.colors.error}
                                    onPress={() => router.push({
                                        pathname: '/add-bill',
                                        params: {
                                            id: item.id,
                                            isEdit: 'true'
                                        }
                                    })}
                                    style={[
                                        styles.editButton,
                                        { borderColor: theme.colors.error }
                                    ]}
                                />
                                <IconButton
                                    icon="delete"
                                    size={20}
                                    iconColor={theme.colors.error}
                                    onPress={() => deleteBill(item.id)}
                                    style={[
                                        styles.deleteButton,
                                        { borderColor: theme.colors.error }
                                    ]}
                                />
                            </View>
                            <View style={styles.statusContainer}>
                                <View style={styles.payRow}>
                                    <Text
                                        variant="labelSmall"
                                        style={[
                                            styles.statusLabel,
                                            { color: getBillStatusColor(item, theme) }
                                        ]}
                                    >
                                        {item.isPaid ? 'PAID' : 'PAY'}
                                    </Text>
                                    <Switch
                                        value={item.isPaid}
                                        onValueChange={() => toggleBillStatus(item.id, item.dueDate)}
                                        trackColor={{
                                            false: getBillStatusColor(item, theme),
                                            true: (theme.colors as any).success || theme.colors.primary
                                        }}
                                        thumbColor="#fff"
                                        ios_backgroundColor={getBillStatusColor(item, theme)}
                                    />
                                </View>
                                <View style={styles.clearedRow}>
                                    <Checkbox.Android
                                        status={item.isCleared ? 'checked' : 'unchecked'}
                                        onPress={() => toggleClearStatus(item.id, item.dueDate)}
                                        color={(theme.colors as any).success || theme.colors.primary}
                                    />
                                    <Text variant="labelSmall" style={styles.clearedText}>
                                        {item.isCleared && item.clearedDate ? `Cleared on ${formatDate(parseDate(item.clearedDate))}` : 'Payment Cleared'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            </GHTouchableOpacity>
        </ScaleDecorator>
    );

    return (
        <SafeAreaView style={[sharedStyles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>My Bills</Text>
                            <Button
                                mode="text"
                                compact
                                onPress={handleReset}
                                icon="refresh"
                                labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                                style={{ marginLeft: 4 }}
                            >
                                RESET
                            </Button>
                        </View>
                        <Card style={[styles.totalCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Card.Content style={styles.totalContent}>
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase' }}>Paid Total</Text>
                                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>{currencySymbol}{paidTotal}</Text>
                            </Card.Content>
                        </Card>
                    </View>

                    <FilterBar
                        filters={filters}
                        allLabel="All Bills"
                        searchPlaceholder="Search bills"
                        showStatusFilter={true}
                    />
                </View>

                <DraggableFlatList
                    data={filteredBills}
                    containerStyle={{ flex: 1 }}
                    onDragEnd={({ data }) => {
                        if (searchQuery.length === 0 && filterPeriod === 'all' && statusFilter === 'all' && selectedCategory === 'All') {
                            setBills(data);
                        }
                    }}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <View>
                            {searchQuery.length === 0 && filterPeriod === 'all' && statusFilter === 'all' && selectedCategory === 'All' && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Long press to reorder
                                </Text>
                            )}

                            {filterPeriod !== 'all' && filterPeriod !== 'monthly' && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Filtering: {formatDate(intervals[filterPeriod as keyof typeof intervals].start)} - {formatDate(intervals[filterPeriod as keyof typeof intervals].end)}
                                </Text>
                            )}

                            {filterPeriod === 'monthly' && selectedMonth >= 0 && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Showing bills for {MONTHS[selectedMonth]} {new Date().getFullYear()}
                                </Text>
                            )}
                            {filteredBills.length === 0 && (
                                <View style={sharedStyles.emptyContainer}>
                                    <IconButton icon="file-search-outline" size={48} iconColor={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                                        No bills found for this period.
                                    </Text>
                                    <Button
                                        mode="contained"
                                        onPress={() => router.push('/add-bill')}
                                        icon="plus"
                                    >
                                        Add New Bill
                                    </Button>
                                </View>
                            )}
                        </View>
                    }
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                />

                <Portal>
                    <FAB
                        icon="plus"
                        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                        onPress={() => router.push('/add-bill')}
                        label="Add Bill"
                        color={theme.dark ? theme.colors.onPrimary : '#F5F7FA'}
                        visible={isFocused}
                    />
                </Portal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    totalCard: {
        borderRadius: 8,
        minWidth: 120,
    },
    totalContent: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'flex-end',
    },
    helperText: {
        marginHorizontal: 16,
        marginBottom: 12,
        opacity: 0.6,
        fontStyle: 'italic',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    card: {
        marginBottom: 12,
        paddingBottom: 5,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLeft: {
        flex: 1,
    },
    alertBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    alertText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    deleteButton: {
        margin: 0,
        marginLeft: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderRadius: 20,
    },
    editButton: {
        margin: 0,
        marginLeft: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderRadius: 20,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    payRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusLabel: {
        marginRight: 4,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    clearedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -4,
    },
    clearedText: {
        marginLeft: -4,
        opacity: 0.8,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 16,
        bottom: Platform.OS === 'ios' ? 90 : 80,
        elevation: 8,
    },
});
