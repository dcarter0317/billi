import React from 'react';
import { View, Modal, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Divider, IconButton, useTheme } from 'react-native-paper';
import { formStyles } from './formStyles';

interface Props<T extends string> {
    visible: boolean;
    title: string;
    options: readonly T[];
    selected: string;
    onSelect: (option: T) => void;
    onClose: () => void;
}

/** Bottom sheet list that lets the user pick one option. */
export function PickerModal<T extends string>({ visible, title, options, selected, onSelect, onClose }: Props<T>) {
    const theme = useTheme();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={formStyles.modalOverlay}>
                <View style={[formStyles.modalContent, { backgroundColor: theme.colors.surface }]}>
                    <View style={formStyles.modalHeader}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{title}</Text>
                        <IconButton icon="close" onPress={onClose} />
                    </View>
                    <Divider />
                    <FlatList
                        data={options}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                            >
                                <Text variant="bodyLarge">{item}</Text>
                                {selected === item && <IconButton icon="check" iconColor={theme.colors.primary} />}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={Divider}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
    },
});
