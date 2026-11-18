# Shared coach voices

Every voice set up here is used by **everyone** who runs the app.

## Add a voice for a coach

1. Put 1–5 audio files (mp3, m4a or wav, each under 10 MB) in that coach's folder,
   e.g. `voices/ironside/take1.mp3`. One to two minutes of clean speech total works best:
   quiet room, no music.
2. Add a `CONSENT.txt` in the same folder. First line: who is speaking. Then a sentence
   saying they agreed to have their voice cloned for this app, e.g.

   ```
   Jamie Lee (Athleet team member)
   I agree to have my voice cloned for the Athleet hackathon demo.
   ```

3. Open the app (or the Coach voices screen and tap Refresh). The server clones the
   files once, saves the voice id in `registry.json`, and every user hears it.

Replace the files to re-clone; the old voice is deleted from ElevenLabs automatically.
Folders without a CONSENT.txt are skipped and show a warning in Coach voices.

Folder names are coach ids: `ironside`, `atlas`, `blaze`, `vanguard`, `rally`, `strike`, `anvil`.

## Files

- Audio files and CONSENT.txt are git-ignored (they stay on your machine).
- `registry.json` holds the voice ids. Commit it so teammates get the same voices
  without needing the audio. Voice ids are not secret; the API key stays in `.env`.
