import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Avatar, useTheme } from 'react-native-paper';
import { Bill } from '../context/BillContext';
import { parseDate, getDisplayDate, getBillAlertStatus, getBillStatusColor } from '../utils/date';
import { CATEGORY_ICONS } from '../constants/categories';

interface BillCardProps {
    bill: Bill;
    filterPeriod?: 'last' | 'this' | 'next' | 'all' | 'monthly';
    selectedMonth?: number;
    upcomingReminderDays: number;
    currencySymbol: string;
}

export default function BillCard({
    bill,
    filterPeriod = 'this',
    selectedMonth = -1,
    upcomingReminderDays,
    currencySymbol
}: BillCardProps) {
    const theme = useTheme();

    return (
        <Card style={styles.billCard}>
            <Card.Title
                title={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{bill.title}</Text>
                        {(() => {
                            const alertStatus = getBillAlertStatus(bill.dueDate, upcomingReminderDays);
                            if (alertStatus === 'none' || bill.isPaid || bill.isCleared) return null;

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dueDate = parseDate(bill.dueDate);
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
                }
                subtitle={
                    <View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Due {parseDate(getDisplayDate(bill, filterPeriod, selectedMonth)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {bill.occurrence === 'Installments' && bill.paymentHistory && bill.paymentHistory.length > 0 && (
                                <Text style={{ color: (theme.colors as any).success || theme.colors.primary }}>
                                    {' • '}Last paid: {bill.paymentHistory[bill.paymentHistory.length - 1].date}
                                </Text>
                            )}
                        </Text>
                        <View style={[styles.categoryBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                            <Text
                                variant="labelSmall"
                                style={[
                                    styles.categoryText,
                                    { color: getBillStatusColor(bill, theme) }
                                ]}
                            >
                                {bill.category}
                            </Text>
                            {bill.occurrence === 'Installments' && bill.totalInstallments && (
                                <>
                                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.3 }} />
                                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                        {bill.paidInstallments || 0} of {bill.totalInstallments} payments made
                                    </Text>
                                </>
                            )}
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
    );
}

const styles = StyleSheet.create({
    billCard: {
        marginBottom: 12,
        paddingTop: 8,
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
});
