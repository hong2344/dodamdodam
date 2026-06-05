'use client';

import { useCallback, useMemo, useState } from 'react';

type PushPermissionState = NotificationPermission | 'unsupported';

type UsePushNotificationOptions = {
  applicationServerKey?: string;
  subscribeUrl?: string;
  accessToken?: string | null;
  getAccessToken?: () => Promise<string | null>;
};

type PushNotificationState = {
  isSupported: boolean;
  isLoading: boolean;
  permission: PushPermissionState;
  error: string | null;
  subscription: PushSubscription | null;
  requestPermissionAndSubscribe: () => Promise<PushSubscription | null>;
};

const DEFAULT_SUBSCRIBE_URL = '/api/push/subscribe';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getInitialPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export function usePushNotification(
  options: UsePushNotificationOptions = {}
): PushNotificationState {
  const [permission, setPermission] = useState<PushPermissionState>(getInitialPermission);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }, []);

  const requestPermissionAndSubscribe = useCallback(async () => {
    setError(null);

    if (!isSupported) {
      setPermission('unsupported');
      setError('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
      return null;
    }

    const applicationServerKey =
      options.applicationServerKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!applicationServerKey) {
      setError('NEXT_PUBLIC_VAPID_PUBLIC_KEY 환경변수가 설정되어 있지 않습니다.');
      return null;
    }

    setIsLoading(true);

    try {
      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);

      if (requestedPermission !== 'granted') {
        setError('알림 권한이 허용되지 않았습니다.');
        return null;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();
      const nextSubscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
        }));

      const token = options.accessToken ?? (await options.getAccessToken?.()) ?? null;
      const response = await fetch(options.subscribeUrl || DEFAULT_SUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(nextSubscription),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(responseBody?.error || '푸시 구독 저장에 실패했습니다.');
      }

      setSubscription(nextSubscription);
      return nextSubscription;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '푸시 구독 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, options]);

  return {
    isSupported,
    isLoading,
    permission,
    error,
    subscription,
    requestPermissionAndSubscribe,
  };
}
