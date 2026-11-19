import { Platform } from 'react-native';

import type { SyncItem } from '@/lib/sync-merge';

// Client for the Athleet accounts server (server/ at the repo root).
// Set EXPO_PUBLIC_ACCOUNTS_URL (e.g. https://athleet-accounts.onrender.com) to turn accounts on.
// It's a public URL, not a secret.

export const ACCOUNTS_URL = (process.env.EXPO_PUBLIC_ACCOUNTS_URL ?? '').replace(/\/+$/, '');
export const accountsEnabled = !!ACCOUNTS_URL;

export type AccountUser = { id: number; username: string; displayName: string; createdAt: number };
export type DeviceSession = { id: string; device: string; createdAt: number; lastUsedAt: number; current: boolean };
type Session = { user: AccountUser; token: string; sessionId: string };

export class AccountError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** A readable label for this device in the "Signed-in devices" list. */
function deviceLabel(): string {
  if (Platform.OS === 'ios') return 'iPhone or iPad · Athleet app';
  if (Platform.OS === 'android') return 'Android · Athleet app';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''} · web`;
}

async function request<T>(method: string, path: string, { body, token }: { body?: unknown; token?: string } = {}): Promise<T> {
  if (!accountsEnabled) throw new AccountError(0, 'disabled', 'Accounts aren’t available in this version of the app.');
  let res: Response;
  try {
    res = await fetch(`${ACCOUNTS_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Athleet-Device': deviceLabel(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError(0, 'offline', 'Can’t reach Athleet right now. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const wait = res.status === 429 && data.retryAfter ? ` (about ${Math.ceil(data.retryAfter / 60)} min)` : '';
    throw new AccountError(res.status, data.error ?? 'error', `${data.message ?? 'Something went wrong. Try again.'}${wait}`);
  }
  return data as T;
}

export const accountApi = {
  signup: (username: string, password: string, displayName?: string) =>
    request<Session & { recoveryCode: string }>('POST', '/api/auth/signup', { body: { username, password, displayName } }),
  login: (username: string, password: string) => request<Session>('POST', '/api/auth/login', { body: { username, password } }),
  recover: (username: string, recoveryCode: string, newPassword: string) =>
    request<Session & { recoveryCode: string }>('POST', '/api/auth/recover', { body: { username, recoveryCode, newPassword } }),
  logout: (token: string) => request<void>('POST', '/api/auth/logout', { token }),

  me: (token: string) => request<{ user: AccountUser; sessionId: string }>('GET', '/api/account', { token }),
  setDisplayName: (token: string, displayName: string) => request<{ user: AccountUser }>('PATCH', '/api/account', { token, body: { displayName } }),
  setUsername: (token: string, username: string, password: string) => request<{ user: AccountUser }>('POST', '/api/account/username', { token, body: { username, password } }),
  setPassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ user: AccountUser }>('POST', '/api/account/password', { token, body: { currentPassword, newPassword } }),
  newRecoveryCode: (token: string, password: string) => request<{ recoveryCode: string }>('POST', '/api/account/recovery-code', { token, body: { password } }),
  sessions: (token: string) => request<{ sessions: DeviceSession[] }>('GET', '/api/account/sessions', { token }),
  revokeSession: (token: string, id: string) => request<void>('DELETE', `/api/account/sessions/${encodeURIComponent(id)}`, { token }),
  revokeOtherSessions: (token: string) => request<{ revoked: number }>('POST', '/api/account/sessions/revoke-others', { token }),
  exportData: (token: string) => request<Record<string, unknown>>('GET', '/api/account/export', { token }),
  deleteAccount: (token: string, password: string, confirm: string) => request<void>('DELETE', '/api/account', { token, body: { password, confirm } }),

  /** `syncKeys` is missing on servers from before it was added: they store the original six keys. */
  health: () => request<{ ok: boolean; syncKeys?: string[] }>('GET', '/api/health'),
  pull: (token: string) => request<{ data: Record<string, SyncItem> }>('GET', '/api/sync', { token }),
  push: (token: string, changes: Record<string, SyncItem>) => request<{ data: Record<string, SyncItem> }>('PUT', '/api/sync', { token, body: { changes } }),
};
