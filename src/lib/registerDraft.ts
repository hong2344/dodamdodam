import type { RegisterData } from '@lib/api/auth';

const KEY = 'dodamdodam.registerDraft';

export function getRegisterDraft(): RegisterData {
  if (typeof window === 'undefined') return {};
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as RegisterData;
  } catch {
    return {};
  }
}

export function updateRegisterDraft(update: RegisterData) {
  if (typeof window === 'undefined') return;
  const next = { ...getRegisterDraft(), ...update };
  window.sessionStorage.setItem(KEY, JSON.stringify(next));
}

export function clearRegisterDraft() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(KEY);
}
