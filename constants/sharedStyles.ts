import { StyleSheet } from 'react-native';

/**
 * Shared styles used by multiple screens (Home, Bills, History).
 * Import and spread into screen-specific StyleSheets to avoid duplication.
 */
export const sharedStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    filterScroll: {
        marginBottom: 12,
    },
    searchBar: {
        height: 44,
        borderRadius: 12,
        marginBottom: 8,
        elevation: 0,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    searchBarInput: {
        minHeight: 0,
        alignSelf: 'center',
        paddingVertical: 0,
        fontSize: 14,
    },
    filterChip: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    filterChipText: {
        textTransform: 'capitalize',
        fontWeight: 'bold',
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
    settledCard: {
        opacity: 0.8,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        elevation: 0,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
