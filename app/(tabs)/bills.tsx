import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Switch, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Text, Card, useTheme, FAB, Searchbar, IconButton, Menu, Divider, Checkbox, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator
} from 'react-native-draggable-flatlist';

import { useBills, Bill } from '../../context/BillContext';
import { usePreferences } from '../../context/UserPreferencesContext';
import { MONTHS, parseDate, getPayPeriodInterval, getBillStatusColor } from '../../utils/date';





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
        last: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodFrequency, -1),
        this: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodFrequency, 0),
        next: getPayPeriodInterval(preferences.payPeriodStart, preferences.payPeriodFrequency, 1),
    }), [preferences.payPeriodStart, preferences.payPeriodFrequency]);

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
            if (filterPeriod === 'monthly') {
                if (selectedMonth === -1) return true; // Show all for year if no month selected
                return billDate.getMonth() === selectedMonth && billDate.getFullYear() === 2026;
            }

            const interval = intervals[filterPeriod as keyof typeof intervals];
            return billDate >= interval.start && billDate <= interval.end;
        });
    }, [bills, searchQuery, filterPeriod, selectedMonth, intervals]);

    const paidTotal = useMemo(() => {
        return bills
            .filter(b => b.isPaid)
            .reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0)
            .toFixed(2);
    }, [bills]);

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Bill>) => (
        <ScaleDecorator>
            <TouchableOpacity
                onLongPress={drag}
                disabled={isActive || searchQuery.length > 0 || filterPeriod !== 'all'}
                activeOpacity={1}
            >
                <Card style={[
                    styles.card,
                    isActive && { backgroundColor: theme.colors.surfaceVariant, elevation: 8 }
                ]}>
                    <Card.Content style={styles.cardContent}>
                        <View style={styles.cardLeft}>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.title}</Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Due {item.dueDate}</Text>
                            <View style={styles.categoryBadge}>
                                <Text variant="labelSmall" style={styles.categoryText}>{item.category}</Text>
                            </View>
                            <Button
                                mode="contained"
                                onPress={() => Alert.alert('Payment', `Redirecting to payment for ${item.title}...`)}
                                style={[styles.paymentButton, { backgroundColor: theme.colors.primary }]}
                                labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
                                compact
                            >
                                MAKE PAYMENT
                            </Button>
                        </View>
                        <View style={styles.cardRight}>
                            <View style={styles.amountRow}>
                                <Text variant="titleMedium" style={{ marginRight: 8 }}>{currencySymbol}{item.amount}</Text>
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    iconColor={(theme.colors as any).warning}
                                    onPress={() => router.push({
                                        pathname: '/add-bill',
                                        params: {
                                            id: item.id,
                                            title: item.title,
                                            amount: item.amount,
                                            dueDate: item.dueDate,
                                            category: item.category,
                                            isPaid: String(item.isPaid),
                                            isCleared: String(item.isCleared),
                                            isEdit: 'true'
                                        }
                                    })}
                                    style={[
                                        styles.editButton,
                                        { borderColor: (theme.colors as any).warning }
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
                                            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: (theme.colors as any).success || theme.colors.primary }}>{currencySymbol}{paidTotal}</Text>
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
                                                {period === 'last' ? 'Last Pay Period' : period === 'this' ? 'Current Pay Period' : period === 'next' ? 'Next Pay Period' : 'All Bills'}
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
                                    Showing bills for {MONTHS[selectedMonth]} 2026
                                </Text>
                            )}
                        </View>
                    }
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                />

                <FAB
                    icon="plus"
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    onPress={() => router.push('/add-bill')}
                    label="Add Bill"
                    color={theme.dark ? theme.colors.onPrimary : '#F5F7FA'}
                />
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
    paymentButton: {
        marginTop: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
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
        right: 0,
        bottom: 0,
    },
});
