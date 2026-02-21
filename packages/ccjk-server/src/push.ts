import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { CONFIG } from './config';

/**
 * Push notification utilities
 */

let expo: Expo | null = null;

function getExpo(): Expo {
  if (!expo) {
    expo = new Expo({
      accessToken: CONFIG.expoPushToken,
    });
  }
  return expo;
}

/**
 * Send push notification
 */
export async function sendPushNotification(
  pushToken: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }
): Promise<void> {
  if (!CONFIG.expoPushToken) {
    console.warn('Expo push token not configured, skipping notification');
    return;
  }

  const expo = getExpo();

  // Check if token is valid
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Invalid Expo push token: ${pushToken}`);
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    // Check for errors
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        console.error('Push notification error:', ticket.message);
      }
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

/**
 * Send batch push notifications
 */
export async function sendBatchPushNotifications(
  notifications: Array<{
    pushToken: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }>
): Promise<void> {
  if (!CONFIG.expoPushToken) {
    console.warn('Expo push token not configured, skipping notifications');
    return;
  }

  const expo = getExpo();

  const messages: ExpoPushMessage[] = notifications
    .filter(n => Expo.isExpoPushToken(n.pushToken))
    .map(n => ({
      to: n.pushToken,
      sound: 'default',
      title: n.title,
      body: n.body,
      data: n.data,
    }));

  try {
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error('Failed to send batch push notifications:', error);
  }
}
