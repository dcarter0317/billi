/// <reference types="@react-native-community/datetimepicker" />
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, FlatList, Switch } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, Divider, IconButton, Checkbox } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useBills } from '../context/BillContext';
import { usePreferences } from '../context/UserPreferencesContext';

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
    'Other'
];

const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
};

export default function AddBillScreen() {
    const theme = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { addBill, updateBill } = useBills();
    const { preferences } = usePreferences();

    const currencySymbol = preferences.currency === 'EUR' ? '€' : '$';

    // Safety check for ID and other params
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const isEdit = params.isEdit === 'true' && !!id;
    const pTitle = Array.isArray(params.title) ? params.title[0] : params.title;
    const pAmount = Array.isArray(params.amount) ? params.amount[0] : params.amount;
    const pDueDate = Array.isArray(params.dueDate) ? params.dueDate[0] : params.dueDate;
    const pCategory = Array.isArray(params.category) ? params.category[0] : params.category;
    const pIsPaid = params.isPaid === 'true';
    const pIsCleared = params.isCleared === 'true';

    console.log('AddBillScreen [Mount] Params:', { id, isEdit, pTitle, pAmount, pDueDate, pCategory, pIsPaid, pIsCleared });

    // Helper for date parsing (MM-DD-YYYY) to Date object
    const parseFormattedDate = (dateStr?: string) => {
        if (!dateStr) return new Date();
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date();
        const [month, day, year] = parts.map(Number);
        return new Date(year, month - 1, day);
    };

    const [title, setTitle] = useState(pTitle || '');
    const [amount, setAmount] = useState(pAmount || '');
    const [date, setDate] = useState(isEdit ? parseFormattedDate(pDueDate) : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [category, setCategory] = useState(pCategory || 'Utilities');
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [isPaid, setIsPaid] = useState(isEdit ? pIsPaid : false);
    const [isCleared, setIsCleared] = useState(isEdit ? pIsCleared : false);

    // Sync state if params change (robustness for some navigation edge cases)
    React.useEffect(() => {
        if (isEdit) {
            setTitle(pTitle || '');
            setAmount(pAmount || '');
            setDate(parseFormattedDate(pDueDate));
            setCategory(pCategory || 'Utilities');
            setIsPaid(pIsPaid);
            setIsCleared(pIsCleared);
            console.log('AddBillScreen [Sync] Latest Params:', { pTitle, pAmount, pDueDate, pIsPaid, pIsCleared });
        }
    }, [pTitle, pAmount, pDueDate, pCategory, pIsPaid, pIsCleared, isEdit]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleSave = () => {
        const finalDueDate = formatDate(date);
        console.log('AddBillScreen [handleSave] isEdit:', isEdit, 'ID:', id);

        if (isEdit && id) {
            console.log('AddBillScreen -> updateBill:', id);
            updateBill(id, {
                title,
                amount,
                dueDate: finalDueDate,
                category,
                isPaid,
                isCleared
            });
        } else {
            console.log('AddBillScreen -> addBill');
            addBill({
                title,
                amount,
                dueDate: finalDueDate,
                category,
                isPaid,
                isCleared
            });
        }
        router.back();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text variant="headlineSmall" style={styles.title}>
                        {isEdit ? 'Edit Bill' : 'Bill Details'}
                    </Text>

                    <Card style={styles.formCard}>
                        <Card.Content>
                            <TextInput
                                label="Payee"
                                value={title}
                                onChangeText={setTitle}
                                mode="outlined"
                                style={styles.input}
                                placeholder="e.g. Electric Company"
                            />

                            <TextInput
                                label="Amount"
                                value={amount}
                                onChangeText={setAmount}
                                mode="outlined"
                                keyboardType="decimal-pad"
                                style={styles.input}
                                placeholder="0.00"
                                left={<TextInput.Affix text={currencySymbol} />}
                                contentStyle={{ paddingLeft: 24 }}
                            />

                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                activeOpacity={0.7}
                            >
                                <View pointerEvents="none">
                                    <TextInput
                                        label="Due Date"
                                        value={formatDate(date)}
                                        mode="outlined"
                                        style={styles.input}
                                        editable={false}
                                        right={<TextInput.Icon icon="calendar-month" />}
                                    />
                                </View>
                            </TouchableOpacity>

                            {showDatePicker && (
                                Platform.OS === 'ios' ? (
                                    <Modal
                                        transparent={true}
                                        animationType="slide"
                                        visible={showDatePicker}
                                        onRequestClose={() => setShowDatePicker(false)}
                                    >
                                        <View style={styles.modalOverlay}>
                                            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, height: 'auto', paddingBottom: 40 }]}>
                                                <View style={styles.modalHeader}>
                                                    <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Due Date</Text>
                                                    <Button onPress={() => setShowDatePicker(false)}>Done</Button>
                                                </View>
                                                <Divider />
                                                <DateTimePicker
                                                    value={date}
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={onDateChange}
                                                    textColor={theme.colors.onSurface}
                                                />
                                            </View>
                                        </View>
                                    </Modal>
                                ) : (
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display="default"
                                        onChange={onDateChange}
                                    />
                                )
                            )}

                            {/* Category Selection */}
                            <TouchableOpacity
                                onPress={() => setShowCategoryMenu(true)}
                                activeOpacity={0.7}
                            >
                                <View pointerEvents="none">
                                    <TextInput
                                        label="Category"
                                        value={category}
                                        mode="outlined"
                                        style={styles.input}
                                        editable={false}
                                        right={<TextInput.Icon icon="chevron-down" />}
                                    />
                                </View>
                            </TouchableOpacity>

                            <Divider style={{ marginVertical: 16 }} />

                            <View style={styles.switchRow}>
                                <Text variant="bodyLarge">Is Paid</Text>
                                <Switch
                                    value={isPaid}
                                    onValueChange={setIsPaid}
                                    trackColor={{ false: '#767577', true: theme.colors.primary }}
                                    thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
                                />
                            </View>

                            <View style={styles.checkboxRow}>
                                <Checkbox.Android
                                    status={isCleared ? 'checked' : 'unchecked'}
                                    onPress={() => setIsCleared(!isCleared)}
                                    color={theme.colors.primary}
                                />
                                <TouchableOpacity onPress={() => setIsCleared(!isCleared)}>
                                    <Text variant="bodyLarge">Payment Cleared</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Category Picker Modal */}
                            <Modal
                                visible={showCategoryMenu}
                                transparent={true}
                                animationType="slide"
                                onRequestClose={() => setShowCategoryMenu(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                                        <View style={styles.modalHeader}>
                                            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Category</Text>
                                            <IconButton
                                                icon="close"
                                                onPress={() => setShowCategoryMenu(false)}
                                            />
                                        </View>
                                        <Divider />
                                        <FlatList
                                            data={CATEGORIES}
                                            keyExtractor={(item: string) => item}
                                            renderItem={({ item }: { item: string }) => (
                                                <TouchableOpacity
                                                    style={styles.categoryItem}
                                                    onPress={() => {
                                                        setCategory(item);
                                                        setShowCategoryMenu(false);
                                                    }}
                                                >
                                                    <Text variant="bodyLarge">{item}</Text>
                                                    {category === item && (
                                                        <IconButton icon="check" iconColor={theme.colors.primary} />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                            ItemSeparatorComponent={() => <Divider />}
                                            contentContainerStyle={{ paddingBottom: 40 }}
                                        />
                                    </View>
                                </View>
                            </Modal>
                        </Card.Content>
                    </Card>

                    <Button
                        mode="contained"
                        onPress={handleSave}
                        style={styles.saveButton}
                        contentStyle={styles.saveButtonContent}
                    >
                        {isEdit ? 'Update Bill' : 'Add Bill'}
                    </Button>

                    <Button
                        mode="text"
                        onPress={() => router.back()}
                        style={styles.cancelButton}
                    >
                        Cancel
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 20,
    },
    formCard: {
        marginBottom: 24,
    },
    input: {
        marginBottom: 16,
    },
    saveButton: {
        borderRadius: 12,
        marginBottom: 12,
    },
    saveButtonContent: {
        paddingVertical: 8,
    },
    cancelButton: {
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        height: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
