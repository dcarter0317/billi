import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Bill } from '../context/BillContext';
import { getBillOccurrencesInInterval, parseDate } from '../utils/date';

const CHANNEL_ID = 'bill-reminders';
const HORIZON_DAYS = 30;
const REMINDER_HOUR = 9;
// iOS keeps at most 64 pending local notifications
const MAX_SCHEDULED = 60;

const supported = Platform.OS !== 'web';

if (supported) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });
}

/** Asks for notification permission if needed. Returns true when reminders can be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
    if (!supported) return false;
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Bill reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
}

export async function cancelBillReminders(): Promise<void> {
    if (!supported) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
}

interface Reminder {
    at: Date;
    title: string;
    body: string;
}

const atReminderHour = (day: Date, daysBefore: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() - daysBefore);
    d.setHours(REMINDER_HOUR, 0, 0, 0);
    return d;
};

/** Reminders for every unpaid occurrence in the next 30 days, soonest first. */
export function buildReminders(bills: Bill[], reminderDays: number, currencySymbol: string, now = new Date()): Reminder[] {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + HORIZON_DAYS + reminderDays);

    const reminders: Reminder[] = [];
    for (const bill of bills) {
        const finished = bill.occurrence === 'Installments' &&
            bill.totalInstallments != null && (bill.paidInstallments || 0) >= bill.totalInstallments;
        if (finished) continue;

        const currentDue = parseDate(bill.dueDate);
        currentDue.setHours(0, 0, 0, 0);
        const detail = `${bill.title} · ${currencySymbol}${bill.amount}`;

        for (const due of getBillOccurrencesInInterval(bill, start, end)) {
            // isPaid and isCleared only describe the current due date
            const settled = (bill.isPaid || bill.isCleared) && due.getTime() === currentDue.getTime();
            if (settled) continue;

            if (reminderDays > 0) {
                reminders.push({
                    at: atReminderHour(due, reminderDays),
                    title: 'Bill coming up',
                    body: `${detail} is due in ${reminderDays} ${reminderDays === 1 ? 'day' : 'days'}`,
                });
            }
            reminders.push({ at: atReminderHour(due, 0), title: 'Bill due today', body: detail });
        }
    }

    return reminders
        .filter(r => r.at > now)
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .slice(0, MAX_SCHEDULED);
}

/** Replaces all scheduled reminders with a fresh set built from the current bills. */
export async function scheduleBillReminders(bills: Bill[], reminderDays: number, currencySymbol: string): Promise<void> {
    if (!supported) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const r of buildReminders(bills, reminderDays, currencySymbol)) {
        await Notifications.scheduleNotificationAsync({
            content: { title: r.title, body: r.body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL_ID },
        });
    }
}
