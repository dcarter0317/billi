import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, useTheme, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import { useBills } from '../../context/BillContext';
import { usePreferences } from '../../context/UserPreferencesContext';

export default function BudgetScreen() {
    const theme = useTheme();
    const { bills } = useBills();
    const { preferences } = usePreferences();
    const currencySymbol = preferences.currency === 'EUR' ? '€' : '$';

    // Calculate totals by category
    const categoryData = React.useMemo(() => {
        const totals: Record<string, number> = {};
        let grandTotal = 0;

        bills.forEach(bill => {
            const amount = parseFloat(bill.amount) || 0;
            totals[bill.category] = (totals[bill.category] || 0) + amount;
            grandTotal += amount;
        });

        const sortedCategories = Object.entries(totals)
            .sort(([, a], [, b]) => b - a);

        const colors = ['#4c669f', '#192f6a', '#00af80', '#FFCC00', '#FF3B30', '#F6C065', '#79D2DE', '#ED6665'];

        const pie = sortedCategories.map(([name, amount], index) => {
            const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
            return {
                value: amount,
                color: colors[index % colors.length],
                text: `${Math.round(percentage)}%`,
                name,
                percentage: Math.round(percentage)
            };
        });

        return {
            pie,
            grandTotal,
            list: sortedCategories.map(([name, amount], index) => ({
                name,
                amount,
                color: colors[index % colors.length]
            }))
        };
    }, [bills]);

    const { pie: pieData, grandTotal, list: categories } = categoryData;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>Budget Analysis</Text>

                <View style={styles.chartContainer}>
                    <PieChart
                        data={pieData}
                        donut
                        radius={120}
                        innerRadius={80}
                        innerCircleColor={theme.colors.background}
                        centerLabelComponent={() => {
                            return <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{currencySymbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                <Text variant="bodySmall">Total Bills</Text>
                            </View>;
                        }}
                    />
                </View>

                <Text variant="titleLarge" style={styles.sectionTitle}>Categories</Text>

                {categories.map((cat, index) => (
                    <Card key={index} style={styles.categoryCard}>
                        <Card.Content>
                            <View style={styles.catHeader}>
                                <Text variant="titleMedium" style={{ fontWeight: '600' }}>{cat.name}</Text>
                                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{currencySymbol}{cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                            </View>
                            <ProgressBar
                                progress={grandTotal > 0 ? cat.amount / grandTotal : 0}
                                color={cat.color}
                                style={styles.progressBar}
                            />
                        </Card.Content>
                    </Card>
                ))}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 24,
    },
    chartContainer: {
        alignItems: 'center',
        marginBottom: 32,
        height: 300,
        justifyContent: 'center'
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 16,
    },
    categoryCard: {
        marginBottom: 12,
    },
    catHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    }
});
