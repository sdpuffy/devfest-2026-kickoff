/// <reference types="node" />
/**
 * Shared (server-wide) coach voices.
 *
 * Two ways a coach gets a voice, both shared by every user of the app:
 *   1. Folder: put 1–5 audio files plus a CONSENT.txt in athleet/voices/<coachId>/.
 *      The next time the app asks for voices, the server clones them once and
 *      remembers the voice id. Changing the files re-clones automatically.
 *   2. Upload: the Voice Settings screen (with its consent checkbox).
 *
 * Voice ids are saved in athleet/voices/registry.json. Commit that file so
 * teammates get the same voices without needing the audio files.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  cloneOnElevenLabs,
  deleteOnElevenLabs,
  MAX_FILE_BYTES,
  MAX_FILES,
  type NamedAudio,
  xiKey,
} from '@/server/elevenlabs';

export const VOICES_DIR = path.join(process.cwd(), 'voices');
const REGISTRY_PATH = path.join(VOICES_DIR, 'registry.json');
const AUDIO_EXT = /\.(mp3|m4a|mp4|aac|wav|webm|ogg)$/i;
const CONSENT_FILE = /^consent(\.(txt|md))?$/i;
export const COACH_ID = /^[a-z0-9_-]{1,40}$/;

export type SharedVoice = {
  voiceId: string;
  source: 'folder' | 'upload';
  sampleNames: string[];
  speaker?: string;
  label?: string;
  createdAt: string;
};

type Registry = {
  version: 1;
  voices: Record<string, SharedVoice>;
  /** Fingerprint of each folder's audio when it was last cloned. */
  folders: Record<string, string>;
};

export type VoiceProblem = { coachId?: string; message: string };

// ─── Registry file ───────────────────────────────────────────────────────────

async function readRegistry(): Promise<Registry> {
  try {
    const parsed = JSON.parse(await fs.readFile(REGISTRY_PATH, 'utf8'));
    return { version: 1, voices: parsed.voices ?? {}, folders: parsed.folders ?? {} };
  } catch {
    return { version: 1, voices: {}, folders: {} };
  }
}

async function writeRegistry(reg: Registry): Promise<void> {
  await fs.mkdir(VOICES_DIR, { recursive: true });
  const tmp = `${REGISTRY_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(reg, null, 2) + '\n');
  await fs.rename(tmp, REGISTRY_PATH);
}

// One change at a time, so two requests can't clone the same folder twice.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

// ─── Folder sync ─────────────────────────────────────────────────────────────

async function readFolder(coachId: string) {
  const dir = path.join(VOICES_DIR, coachId);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const audio = entries
    .filter((e) => e.isFile() && !e.name.startsWith('.') && AUDIO_EXT.test(e.name))
    .map((e) => e.name)
    .sort();
  const consentName = entries.find((e) => e.isFile() && CONSENT_FILE.test(e.name))?.name;
  const consent = consentName ? (await fs.readFile(path.join(dir, consentName), 'utf8')).trim() : '';
  const stats = await Promise.all(audio.map((n) => fs.stat(path.join(dir, n))));
  const fingerprint = audio.map((n, i) => `${n}:${stats[i].size}:${Math.round(stats[i].mtimeMs)}`).join('|');
  return { dir, audio, sizes: stats.map((s) => s.size), consent, fingerprint };
}

/** Clone any coach folder whose audio is new or changed. */
export function syncVoiceFolders(): Promise<{ voices: Record<string, SharedVoice>; problems: VoiceProblem[] }> {
  return locked(async () => {
    const reg = await readRegistry();
    const problems: VoiceProblem[] = [];
    if (!xiKey()) {
      problems.push({ message: 'ELEVENLABS_API_KEY is missing in athleet/.env (restart Expo after adding it).' });
      return { voices: reg.voices, problems };
    }

    let dirs: string[] = [];
    try {
      dirs = (await fs.readdir(VOICES_DIR, { withFileTypes: true }))
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
        .map((e) => e.name);
    } catch {
      return { voices: reg.voices, problems };
    }

    let changed = false;
    for (const coachId of dirs) {
      if (!COACH_ID.test(coachId)) {
        problems.push({ coachId, message: `Folder "${coachId}" isn't a valid coach id (use lowercase, e.g. "ironside").` });
        continue;
      }
      let folder;
      try {
        folder = await readFolder(coachId);
      } catch (err: any) {
        problems.push({ coachId, message: `Couldn't read voices/${coachId}: ${err?.message ?? err}` });
        continue;
      }
      if (!folder.audio.length) continue;
      if (reg.folders[coachId] === folder.fingerprint) continue; // already cloned these exact files

      if (!folder.consent) {
        problems.push({
          coachId,
          message: `voices/${coachId} needs a CONSENT.txt saying who is speaking and that they agreed to have their voice cloned.`,
        });
        continue;
      }
      if (folder.audio.length > MAX_FILES) {
        problems.push({ coachId, message: `voices/${coachId} has ${folder.audio.length} audio files; use at most ${MAX_FILES}.` });
        continue;
      }
      const tooBig = folder.audio.find((_, i) => folder.sizes[i] > MAX_FILE_BYTES);
      if (tooBig) {
        problems.push({ coachId, message: `voices/${coachId}/${tooBig} is over 10 MB.` });
        continue;
      }

      try {
        const files: NamedAudio[] = await Promise.all(
          folder.audio.map(async (name) => {
            const buf = await fs.readFile(path.join(folder.dir, name));
            return new File([buf], name, { type: mimeFor(name) }) as unknown as NamedAudio;
          }),
        );
        const voiceId = await cloneOnElevenLabs(files, coachId, coachId);
        const previous = reg.voices[coachId]?.voiceId;
        reg.voices[coachId] = {
          voiceId,
          source: 'folder',
          sampleNames: folder.audio,
          speaker: folder.consent.split('\n')[0].slice(0, 120),
          createdAt: new Date().toISOString(),
        };
        reg.folders[coachId] = folder.fingerprint;
        changed = true;
        if (previous && previous !== voiceId) await deleteOnElevenLabs(previous);
        console.log(`[voices] Created shared voice for "${coachId}" from ${folder.audio.length} file(s).`);
      } catch (err: any) {
        problems.push({ coachId, message: err?.message ?? String(err) });
      }
    }

    if (changed) await writeRegistry(reg);
    return { voices: reg.voices, problems };
  });
}

/** Save a voice created from an in-app upload as the coach's shared voice. */
export function setUploadedVoice(coachId: string, voice: Omit<SharedVoice, 'source' | 'createdAt'>): Promise<SharedVoice> {
  return locked(async () => {
    const reg = await readRegistry();
    const previous = reg.voices[coachId]?.voiceId;
    const saved: SharedVoice = { ...voice, source: 'upload', createdAt: new Date().toISOString() };
    reg.voices[coachId] = saved;
    await writeRegistry(reg);
    if (previous && previous !== voice.voiceId) await deleteOnElevenLabs(previous);
    return saved;
  });
}

/**
 * Remove a coach's shared voice. Folder files stay; they won't be re-cloned
 * unless they change (delete or replace them to stop that).
 */
export function removeSharedVoice(coachId: string): Promise<boolean> {
  return locked(async () => {
    const reg = await readRegistry();
    const existing = reg.voices[coachId];
    if (!existing) return false;
    delete reg.voices[coachId];
    await writeRegistry(reg);
    await deleteOnElevenLabs(existing.voiceId);
    return true;
  });
}

function mimeFor(name: string): string {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'm4a' || ext === 'mp4') return 'audio/mp4';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'webm') return 'audio/webm';
  if (ext === 'ogg') return 'audio/ogg';
  return 'audio/mpeg';
}
