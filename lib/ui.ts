import { Alert, Platform } from 'react-native';

type AlertAction = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export function notify(title: string, message?: string, actions?: AlertAction[]) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert([title, message].filter(Boolean).join('\n\n'));
    const primary = actions?.find((action) => action.style !== 'cancel') ?? actions?.[0];
    primary?.onPress?.();
    return;
  }

  Alert.alert(title, message, actions);
}

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = '확인',
  cancelText = '취소',
) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm([title, message].filter(Boolean).join('\n\n'))) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, onPress: onConfirm },
  ]);
}
