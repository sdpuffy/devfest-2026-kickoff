import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { coachVoiceOptions } from '@/lib/voice';
import { getClonedVoice, speakWithClonedVoice, stopClonedAudio } from '@/lib/voice-clone';
import { emptySpeechAnimation, speechWords } from '@/lib/speech-animation';

export function useCoachSpeech(initiallyEnabled = false, coachId = 'atlas') {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const animation = useRef(emptySpeechAnimation());
  const stop = useCallback(() => {
    generation.current++;
    animation.current = emptySpeechAnimation();
    setSpeaking(false);
    void Speech.stop().catch(() => {});
    stopClonedAudio();
  }, []);
  const speak = useCallback(async (text: string) => {
    const token = ++generation.current;
    animation.current = emptySpeechAnimation();
    setError('');
    setSpeaking(false);
    try {
      await Speech.stop();
      stopClonedAudio();
      const finish = () => { if (token === generation.current) { animation.current = emptySpeechAnimation(); setSpeaking(false); } };
      const begin = () => {
        if (token !== generation.current) return;
        animation.current = { words: speechWords(text), startedAt: Date.now(), boundaryAt: 0, wordIndex: -1, active: true };
        setSpeaking(true);
      };
      // Custom voice from Voice Settings first; the mouth animation runs on word timing.
      if (getClonedVoice(coachId)) {
        const played = await speakWithClonedVoice(coachId, text, { onStart: begin, onDone: finish });
        if (played || token !== generation.current) return;
      }
      const voiceOptions = await coachVoiceOptions(coachId);
      if (token !== generation.current) return;
      Speech.speak(text, {
        ...voiceOptions,
        onStart: begin,
        onBoundary: (event: { charIndex: number }) => {
          if (token !== generation.current || !animation.current.active) return;
          const words = animation.current.words;
          const index = words.findIndex(w => event.charIndex >= w.index && event.charIndex < w.index + w.text.length);
          if (index >= 0) { animation.current.wordIndex = index; animation.current.boundaryAt = Date.now(); }
        },
        onDone: finish, onStopped: finish,
        onError: () => { if (token === generation.current) { finish(); setError('Audio unavailable. You can keep going with the text.'); } },
      });
    } catch {
      if (token === generation.current) setError('Audio unavailable. You can keep going with the text.');
    }
  }, [coachId]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => subscription.remove();
  }, [stop]);
  useEffect(() => () => { generation.current++; animation.current = emptySpeechAnimation(); void Speech.stop().catch(() => {}); stopClonedAudio(); }, []);
  return { animation, enabled, setEnabled, speaking, error, speak, stop };
}
