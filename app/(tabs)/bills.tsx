import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Switch, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Card, useTheme, FAB, Searchbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator
} from 'react-native-draggable-flatlist';

import { useBills, Bill } from '../../context/BillContext';
import { usePreferences } from '../../context/UserPreferencesContext';

// Helper for date formatting/parsing (MM-DD-YYYY)
const parseDate = (dateStr: string) => {
    const [month, day, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// 14-day Pay Period Logic (Reference starting Monday)
const PAY_CYCLE_START = new Date(2026, 0, 26); // Jan 26, 2026
const getPayPeriodInterval = () => {
    const now = new Date(2026, 1, 5); // Feb 5, 2026
    const diff = now.getTime() - PAY_CYCLE_START.getTime();
    const daysSinceStart = Math.floor(diff / (1000 * 60 * 60 * 24));
    const periodsPassed = Math.floor(daysSinceStart / 14);

    const start = new Date(PAY_CYCLE_START);
    start.setDate(PAY_CYCLE_START.getDate() + (periodsPassed * 14));

    const end = new Date(start);
    end.setDate(start.getDate() + 13);

    return { start, end };
};

// Helper for status coloring
const getBillStatusColor = (bill: Bill, theme: any) => {
    if (bill.isPaid) {
        return theme.dark ? theme.colors.success : '#1B5E20';
    }

    const today = new Date(2026, 1, 5);
    const dueDate = parseDate(bill.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) {
        return theme.dark ? theme.colors.error : '#B71C1C';
    }
    return theme.dark ? (theme.colors as any).warning : '#E65100';
};

// interface Bill moved to context/BillContext.tsx

export default function BillsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { bills, setBills, deleteBill: contextDeleteBill, toggleBillStatus } = useBills();
    const { preferences } = usePreferences();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPayPeriod, setFilterPayPeriod] = useState(false);

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

    const currentPeriod = useMemo(() => getPayPeriodInterval(), []);

    const filteredBills = useMemo(() => {
        return bills.filter(bill => {
            const matchesSearch = bill.title.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            if (filterPayPeriod) {
                const billDate = parseDate(bill.dueDate);
                return billDate >= currentPeriod.start && billDate <= currentPeriod.end;
            }
            return true;
        });
    }, [bills, searchQuery, filterPayPeriod, currentPeriod]);

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
                disabled={isActive || searchQuery.length > 0 || filterPayPeriod}
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
                        if (searchQuery.length === 0 && !filterPayPeriod) {
                            setBills(data);
                        }
                    }}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <View>
                            <View style={styles.header}>
                                <View style={styles.headerTop}>
                                    <View>
                                        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>My Bills</Text>
                                        <TouchableOpacity
                                            onPress={() => setFilterPayPeriod(!filterPayPeriod)}
                                            style={[
                                                styles.periodToggle,
                                                filterPayPeriod && { backgroundColor: theme.colors.primaryContainer }
                                            ]}
                                        >
                                            <Text variant="labelMedium" style={{ color: filterPayPeriod ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}>
                                                {filterPayPeriod ? 'Showing This Pay Period' : 'Show All Bills'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Card style={[styles.totalCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                                        <Card.Content style={styles.totalContent}>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase' }}>Paid Total</Text>
                                            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: (theme.colors as any).success || theme.colors.primary }}>{currencySymbol}{paidTotal}</Text>
                                        </Card.Content>
                                    </Card>
                                </View>
                            </View>

                            <Searchbar
                                placeholder="Search bills"
                                onChangeText={setSearchQuery}
                                value={searchQuery}
                                style={styles.searchBar}
                            />

                            {searchQuery.length === 0 && !filterPayPeriod && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Long press to reorder
                                </Text>
                            )}

                            {filterPayPeriod && (
                                <Text variant="labelSmall" style={styles.helperText}>
                                    Filtering: {currentPeriod.start.toLocaleDateString()} - {currentPeriod.end.toLocaleDateString()}
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
    },
    periodToggle: {
        marginTop: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusLabel: {
        marginRight: 4,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});
