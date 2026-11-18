// Username and password rules, mirrored from server/src/rules.js so forms can give instant
// feedback. The server is the authority; tests/accounts.test.cjs checks the two agree.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MAX = 40;

const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'athleet', 'coach', 'coaches',
  'moderator', 'mod', 'staff', 'official', 'security', 'api', 'null', 'undefined', 'me', 'settings', 'account',
]);

const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890', '11111111', '00000000',
  'qwertyui', 'qwerty123', 'qwertyuiop', 'iloveyou', 'abc12345', 'abcd1234', 'football', 'baseball',
  'basketball', 'letmein1', 'welcome1', 'sunshine', 'princess', 'trustno1', 'superman', 'athleet1', 'athleet123',
  'passw0rd', 'p@ssw0rd', '1q2w3e4r', 'asdfghjk', 'zaq12wsx', 'monkey12', 'dragon12', 'starwars', 'whatever',
]);

export function usernameProblem(username: string): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return `Usernames are ${USERNAME_MIN}-${USERNAME_MAX} characters.`;
  if (!/^[A-Za-z0-9_.]+$/.test(username)) return 'Use only letters, numbers, underscores and dots.';
  if (/^[._]|[._]$/.test(username)) return 'Usernames can’t start or end with a dot or underscore.';
  if (/[._]{2}/.test(username)) return 'Usernames can’t have two dots or underscores in a row.';
  if (RESERVED.has(username.toLowerCase())) return 'That username is reserved. Try another.';
  return null;
}

export function passwordProblem(password: string, username = ''): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (username && password.toLowerCase().includes(username.toLowerCase())) return 'Your password can’t contain your username.';
  if (COMMON.has(password.toLowerCase())) return 'That password is too common. Try a longer phrase.';
  if (/^(.)\1+$/.test(password)) return 'Don’t repeat one character.';
  return null;
}

/** 0-4: a rough strength meter for the sign-up form. */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  let score = password.length >= 16 ? 3 : password.length >= 12 ? 2 : password.length >= PASSWORD_MIN ? 1 : 0;
  if (kinds >= 3) score++;
  if (COMMON.has(password.toLowerCase())) score = 0;
  return Math.min(4, score);
}
