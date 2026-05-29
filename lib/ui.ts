type AlertAction = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export function notify(title: string, message?: string, actions?: AlertAction[]) {
  if (typeof window === 'undefined') return;

  window.alert([title, message].filter(Boolean).join('\n\n'));
  const primary = actions?.find((action) => action.style !== 'cancel') ?? actions?.[0];
  primary?.onPress?.();
}

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  _confirmText = '확인',
  _cancelText = '취소',
) {
  if (typeof window === 'undefined') return;

  if (window.confirm([title, message].filter(Boolean).join('\n\n'))) {
    onConfirm();
  }
}
