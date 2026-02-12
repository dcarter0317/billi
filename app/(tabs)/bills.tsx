import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Switch, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Text, Card, useTheme, FAB, Searchbar, IconButton, Menu, Divider, Checkbox, Button, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator
} from 'react-native-draggable-flatlist';

import { useBills, Bill } from '../../context/BillContext';
import { usePreferences } from '../../context/UserPreferencesContext';
import { MONTHS, parseDate, getPayPeriodInterval, getBillStatusColor, getDisplayDate, getBillAlertStatus } from '../../utils/date';





// interface Bill moved to context/BillContext.tsx

export default function BillsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { bills, setBills, deleteBill: contextDeleteBill, toggleBillStatus, toggleClearStatus, resetAllStatuses } = useBills();
    const { preferences } = usePreferences();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPeriod, setFilterPeriod] = useState<'last' | 'this' | 'next' | 'all' | 'monthly'>('all');
    const [selectedMonth, setSelectedMonth] = useState(-1);
    const [showMonthMenu, setShowMonthMenu] = useState(false);

    const currencySymbol = preferences.currency === 'EUR' ? '€' : '$';

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

    const intervals = useMemo(() => ({
        last: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, -1),
        this: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 0),
        next: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodOccurrence, 1),
    }), [preferences.payPeriodStart, preferences.payPeriodOccurrence]);

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
        return bills.filter(bill => {
            const matchesSearch = bill.title.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            if (filterPeriod === 'all') return true;

            const billDate = parseDate(bill.dueDate);
            const today = new Date();
            const currentYear = today.getFullYear();

            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) return true;

                // Show if it matches exactly
                if (billDate.getMonth() === selectedMonth && billDate.getFullYear() === currentYear) return true;

                // For recurring bills, project into future months
                if (bill.isRecurring) {
                    if (billDate.getFullYear() < currentYear) return true;
                    if (billDate.getFullYear() === currentYear && selectedMonth > billDate.getMonth()) return true;
                }
                return false;
            }

            const interval = intervals[filterPeriod as keyof typeof intervals];
            if (!interval) return false;

            // Show if it exactly falls within the interval
            if (billDate >= interval.start && billDate <= interval.end) return true;

            // For recurring bills, show if the interval is in the future relative to the bill's current due date
            if (bill.isRecurring && interval.start > billDate) {
                return true;
            }

            return false;
        });
    }, [bills, searchQuery, filterPeriod, selectedMonth, intervals]);

    const paidTotal = useMemo(() => {
        return filteredBills
            .filter(b => b.isPaid)
            .reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0)
            .toFixed(2);
    }, [filteredBills]);

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Bill>) => (
        <ScaleDecorator>
            <TouchableOpacity
                onLongPress={drag}
                disabled={isActive || searchQuery.length > 0 || filterPeriod !== 'all'}
                activeOpacity={1}
            >
                <Card style={[
                    styles.card,
                    isActive && { backgroundColor: theme.colors.surfaceVariant, elevation: 8 },
                    (item.isPaid || item.isCleared) && styles.settledCard
                ]}>
                    <Card.Content style={styles.cardContent}>
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
                                Due {getDisplayDate(item, filterPeriod, selectedMonth)}
                                {item.occurrence === 'Installments' && item.paymentHistory && item.paymentHistory.length > 0 && (
                                    <Text style={{ color: (theme.colors as any).success || theme.colors.primary }}>
                                        {' • '}Last paid: {item.paymentHistory[item.paymentHistory.length - 1].date}
                                    </Text>
                                )}
                            </Text>
                            <View style={[styles.categoryBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                <Text variant="labelSmall" style={styles.categoryText}>{item.category}</Text>
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
                                        onValueChange={() => toggleBillStatus(item.id)}
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
                                        onPress={() => toggleClearStatus(item.id)}
                                        color={(theme.colors as any).success || theme.colors.primary}
                                    />
                                    <Text variant="labelSmall" style={styles.clearedText}>
                                        {item.isCleared && item.clearedDate ? `Cleared on ${item.clearedDate}` : 'Payment Cleared'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            </TouchableOpacity>
        </ScaleDecorator>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <DraggableFlatList
                    data={filteredBills}
                    onDragEnd={({ data }) => {
                        // Only update main bills list if we're not filtering
                        if (searchQuery.length === 0 && filterPeriod === 'all') {
                            setBills(data);
                        }
                    }}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <View>
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

                                <View style={styles.monthlyFilterRow}>
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
                            </View>

                            <Searchbar
                                placeholder="Search bills"
                                onChangeText={setSearchQuery}
                                value={searchQuery}
                                style={styles.searchBar}
                            />

                            {searchQuery.length === 0 && filterPeriod === 'all' && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Long press to reorder
                                </Text>
                            )}

                            {filterPeriod !== 'all' && filterPeriod !== 'monthly' && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Filtering: {intervals[filterPeriod as keyof typeof intervals].start.toLocaleDateString()} - {intervals[filterPeriod as keyof typeof intervals].end.toLocaleDateString()}
                                </Text>
                            )}

                            {filterPeriod === 'monthly' && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Showing bills for {MONTHS[selectedMonth]} {new Date().getFullYear()}
                                </Text>
                            )}
                            {filteredBills.length === 0 && (
                                <View style={styles.emptyContainer}>
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
                    />
                </Portal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    filterScroll: {
        marginTop: 4,
    },
    monthlyFilterRow: {
        marginTop: 8,
    },
    filterChip: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    filterChipText: {
        textTransform: 'capitalize',
        fontWeight: 'bold',
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
    searchBar: {
        marginHorizontal: 0,
        marginBottom: 8,
        borderRadius: 12, // Adding extra roundness for a premium look
    },
    helperText: {
        marginHorizontal: 16,
        marginBottom: 12,
        opacity: 0.6,
        fontStyle: 'italic',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
        paddingBottom: 5,
    },
    settledCard: {
        opacity: 0.8,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        elevation: 0,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLeft: {
        flex: 1,
    },
    categoryBadge: {
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 8,
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

    categoryText: {
        color: '#E65100', // Darker Orange for better contrast
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: 'bold',
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
        bottom: Platform.OS === 'ios' ? 90 : 80, // Elevation to avoid overlap with tab bar
        elevation: 8,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
