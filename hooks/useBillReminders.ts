import { useEffect } from 'react';
import { useBills } from '../context/BillContext';
import { usePreferences } from '../context/UserPreferencesContext';
import { getCurrencySymbol } from '../utils/currency';
import { cancelBillReminders, ensureNotificationPermission, scheduleBillReminders } from '../services/notifications';

/** Keeps scheduled bill reminders in step with the bills and the notification settings. */
export function useBillReminders() {
    const { bills } = useBills();
    const { preferences } = usePreferences();
    const { notificationsEnabled, upcomingReminderDays, currency } = preferences;

    useEffect(() => {
        // Wait briefly so a burst of bill updates schedules once
        const timer = setTimeout(async () => {
            try {
                if (notificationsEnabled && await ensureNotificationPermission()) {
                    await scheduleBillReminders(bills, upcomingReminderDays, getCurrencySymbol(currency));
                } else {
                    await cancelBillReminders();
                }
            } catch (error) {
                console.error('Failed to schedule bill reminders:', error);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [bills, notificationsEnabled, upcomingReminderDays, currency]);
}
