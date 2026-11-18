import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { sampleSpeech, emptySpeechAnimation, type SpeechAnimation } from '@/lib/speech-animation';
import { coachPose, easeInOut, type CoachMotion, type CoachPose } from '@/lib/coach-motion';
import { ExerciseDemo } from './exercise-demo';
import { coachArt, type CoachArt } from './coach-art';
import type { Coach } from '@/lib/types';
import { useReduceMotion } from '@/lib/appearance';
import { themedStyles } from '@/lib/theme';

const restingSpeech = sampleSpeech(emptySpeechAnimation(), 0);
const neutral = coachPose(0, 'idle', true, restingSpeech);
const poseKeys = Object.keys(neutral) as (keyof CoachPose)[];
const status = { idle: 'READY WHEN YOU ARE', talking: 'COACH IS SPEAKING', exercise: 'MOVEMENT DEMO · SQUAT', celebrate: 'LET’S GO!', thinking: 'THINKING…' };

export function AnimatedCoach({ coach, motion, speechAnimation, compact = false, height, showStatus = true, exercise, paused = false }: { exercise?: string; paused?: boolean; coach: Coach; compact?: boolean; height?: number; showStatus?: boolean; motion: CoachMotion; speechAnimation: RefObject<SpeechAnimation> }) {
  const current = useRef(motion);
  useEffect(() => { current.current = motion; }, [motion]);
  const playback = useRef({ exercise, paused });
  useEffect(() => { playback.current = { exercise, paused }; }, [exercise, paused]);
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  // Settings → Reduce motion, falling back to the OS setting.
  const reduced = useReduceMotion();
  const [values] = useState(() => Object.fromEntries(poseKeys.map(key => [key, new Animated.Value(neutral[key])])) as Record<keyof CoachPose, Animated.Value>);
  const pose = useRef(neutral);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => app.remove();
  }, []);
  useEffect(() => {
    if (!focused || !foreground || (motion === 'exercise' && exercise)) return;
    let frame = 0;
    let previous = 0;
    let start = 0;
    let transitionStart = 0;
    let elapsed = 0;
    let activeExercise = playback.current.exercise;
    let state = current.current;
    let from = { ...pose.current };
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - previous < 1000 / 30) return;
      const dt = previous ? Math.min(.05, (now - previous) / 1000) : 1 / 30;
      previous = now;
      if (!start) { start = now; transitionStart = now; }
      if (state !== current.current || activeExercise !== playback.current.exercise) {
        activeExercise = playback.current.exercise; elapsed = 0;
        state = current.current; start = now; transitionStart = now; from = { ...pose.current };
      }
      if (!playback.current.paused) elapsed += dt;
      if (state === 'exercise' && playback.current.paused) return;
      const target = coachPose(elapsed, state, reduced, sampleSpeech(speechAnimation.current, Date.now()));
      const blend = reduced ? 1 : easeInOut((now - transitionStart) / 450);
      for (const key of poseKeys) {
        // Keep word boundaries responsive, while softly settling lips between syllables.
        const facial = key === 'mouth' || key === 'width' || key === 'brow';
        const value = facial ? pose.current[key] + (target[key] - pose.current[key]) * (1 - Math.exp(-dt * 22)) : from[key] + (target[key] - from[key]) * blend;
        pose.current[key] = value;
        values[key].setValue(value);
      }
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [focused, foreground, reduced, speechAnimation, values, motion, exercise]);
  if (motion === 'exercise' && exercise) return <ExerciseDemo key={exercise} coach={coach} exercise={exercise} paused={paused} height={height ?? (compact ? 210 : 300)} />;
  const stageHeight = height ?? (compact ? 190 : 300);
  const size = Math.max(0, Math.min(compact ? 172 : 278, stageHeight - (showStatus ? 22 : 0)));
  const rotate = (value: Animated.Value, direction = 1) => value.interpolate({ inputRange: [-180, 180], outputRange: [`${-180 * direction}deg`, `${180 * direction}deg`] });
  const layers = coachArt[coach.id] ?? coachArt.atlas;
  const art = (name: keyof CoachArt) => <Image source={layers[name]} style={styles.image} contentFit="contain" accessible={false} />;
  return (
    <View style={[styles.stage, { height: stageHeight }]} accessible accessibilityLabel={`Illustrated ${coach.name} coach, ${exercise && motion === 'exercise' ? exercise : motion}`}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
        {art('floor')}
        <Animated.View style={[styles.layer, { transform: [{ translateY: Animated.multiply(values.body, size / 320) }, { rotate: rotate(values.tilt) }] }]}>
          {(['left', 'right'] as const).map((side, i) => {
            const x = (i === 0 ? 137 : 183) / 320 * 100;
            const direction = i === 0 ? 1 : -1;
            return <Animated.View key={side} style={[styles.layer, { transformOrigin: `${x}% 76.25%`, transform: [{ rotate: Animated.add(Animated.multiply(values.knee, direction), i === 0 ? values.leftLeg : values.rightLeg).interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) }] }]}>
              {art(side === 'left' ? 'leftThigh' : 'rightThigh')}
              <Animated.View style={[styles.layer, { transformOrigin: `${x}% 85%`, transform: [{ rotate: rotate(values.knee, -2 * direction) }] }]}>
                {art(side === 'left' ? 'leftShin' : 'rightShin')}
                <Animated.View style={[styles.layer, { transformOrigin: `${x}% 93.75%`, transform: [{ rotate: rotate(values.knee, direction) }] }]}>{art(side === 'left' ? 'leftShoe' : 'rightShoe')}</Animated.View>
              </Animated.View>
            </Animated.View>;
          })}
          <Animated.View style={[styles.layer, { transformOrigin: '35% 56.5%', transform: [{ rotate: rotate(values.left) }] }]}>{art('left')}</Animated.View>
          <Animated.View style={[styles.layer, { transformOrigin: '65% 56.5%', transform: [{ rotate: rotate(values.right) }] }]}>{art('right')}</Animated.View>
          {art('body')}
          <Animated.View style={[styles.layer, { transformOrigin: '50% 55%', transform: [{ rotate: rotate(values.head) }] }]}>
            {art('head')}
            <Animated.View style={[styles.layer, { transformOrigin: '50% 36.5%', transform: [{ scaleY: values.eyes }] }]}>{art('eyes')}</Animated.View>
            <Animated.View style={[styles.layer, { transform: [{ translateY: Animated.multiply(values.brow, size / 320) }] }]}>{art('brows')}</Animated.View>
            {art('detail')}
            <Animated.View style={[styles.layer, { transformOrigin: '50% 50%', transform: [{ scaleY: values.mouth }, { scaleX: values.width }] }]}>{art('mouth')}</Animated.View>
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.layer, { opacity: values.confetti, transform: [{ translateY: Animated.multiply(values.body, size / 640) }] }]}>{art('confetti')}</Animated.View>
      </View>
      {showStatus && <Text style={styles.status} numberOfLines={1}>{motion === 'exercise' && exercise ? `${paused ? 'PAUSED' : 'MOVEMENT PREVIEW'} · ${exercise}` : status[motion]}</Text>}
    </View>
  );
}
const styles = themedStyles(() => ({
  stage: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  layer: { ...StyleSheet.absoluteFill },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  status: { color: '#ffd65a', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
}));
