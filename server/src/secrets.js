import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

// Password and recovery-code hashing (scrypt), session tokens and recovery codes.

const N = 2 ** 15, R = 8, P = 1, KEY_LENGTH = 64;
const MAXMEM = 64 * 1024 * 1024;

function scrypt(secret, salt, n = N, r = R, p = P) {
  return new Promise((resolve, reject) => {
    scryptCallback(secret.normalize('NFKC'), salt, KEY_LENGTH, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** "scrypt$N$r$p$salt$hash" (base64). */
export async function hashSecret(secret) {
  const salt = randomBytes(16);
  const key = await scrypt(secret, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifySecret(secret, stored) {
  const [scheme, n, r, p, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(secret, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Compared against when the username doesn't exist, so a wrong username takes as long as a wrong password.
let dummy;
export async function burnTime(secret) {
  dummy ??= await hashSecret('not-a-real-password');
  await verifySecret(String(secret ?? ''), dummy);
}

/** A session token for the client, and the SHA-256 we store instead of it. */
export function newToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: tokenHash(token) };
}

export function tokenHash(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function newId() {
  return randomBytes(12).toString('base64url');
}

// Crockford-style alphabet: no 0/O or 1/I/L to misread.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

/** e.g. "K7QMB-2XWDA-9PRTS-HN4CE-Z8VBG": 25 characters (~120 bits), easy to write down. */
export function newRecoveryCode() {
  const bytes = randomBytes(25);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return chars.match(/.{5}/g).join('-');
}

/** Case, spaces and dashes don't matter when typing the code back in. */
export function normalizeRecoveryCode(code) {
  return String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
