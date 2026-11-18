import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { exerciseRig, type Point } from '@/lib/exercise-rig';
import type { Coach } from '@/lib/types';
import { coachArt } from './coach-art';
import { useReduceMotion } from '@/lib/appearance';
import { themedStyles } from '@/lib/theme';

const looks: Record<string, [string, string]> = {
  atlas: ['#985b3c', '#ffcf32'], ironside: ['#945436', '#bc4941'], blaze: ['#875336', '#ffcf32'],
  vanguard: ['#d79a70', '#bf4142'], rally: ['#a8673e', '#294267'], strike: ['#ecc09a', '#3879b3'], anvil: ['#e6b18b', '#424f60'],
};
function Bone({ a, b, color, width, opacity = 1 }: { a: Point; b: Point; color: string; width: number; opacity?: number }) {
  return <View style={{ position: 'absolute', left: a.x - width / 2, top: a.y - width / 2, width: Math.hypot(b.x - a.x, b.y - a.y) + width, height: width, borderRadius: width / 2, backgroundColor: color, opacity, transformOrigin: `${width / 2}px 50%`, transform: [{ rotate: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` }] }} />;
}
export function ExerciseDemo({ coach, exercise, paused, height = 210 }: { coach: Coach; exercise: string; paused: boolean; height?: number }) {
  const [time, setTime] = useState(0);
  const elapsed = useRef(0);
  const [focused, setFocused] = useState(true);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  // Settings → Reduce motion, falling back to the OS setting.
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(360);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (paused || reduced || !focused || !active) return;
    let frame = 0, previous = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!previous) previous = now;
      if (now - previous < 1000 / 24) return;
      elapsed.current += Math.min((now - previous) / 1000, .1);
      previous = now; setTime(elapsed.current);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, focused, active, exercise]);
  const pose = exerciseRig(reduced ? 0 : time, exercise);
  if (!pose) return <View style={[styles.stage, { height }]}><Text style={styles.cue}>A movement demo isn’t available for this exercise yet.</Text></View>;
  const [skin, kit] = looks[coach.id] ?? looks.atlas;
  const art = coachArt[coach.id] ?? coachArt.atlas;
  const scale = Math.min(width / 360, (height - 32) / 200);
  const angle = Math.atan2(pose.shoulder.y - pose.hip.y, pose.shoulder.x - pose.hip.x);
  const head = { x: pose.shoulder.x + Math.cos(angle) * 19, y: pose.shoulder.y + Math.sin(angle) * 19 };
  return <View style={[styles.stage, { height }]} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessible accessibilityLabel={`${coach.name}: ${exercise}. ${pose.cue}. ${paused ? 'Paused' : 'Playing'}`}>
    <View style={{ width: 360, height: 200, transform: [{ scale }], marginVertical: (200 * scale - 200) / 2 }} pointerEvents="none" accessibilityElementsHidden>
      <View style={styles.floor} />
      {pose.equipment === 'mat' && <View style={styles.mat} />}
      {pose.equipment === 'bench' && <View style={styles.bench} />}
      {pose.equipment === 'bar' && <View style={styles.bar} />}
      {/step-up/i.test(exercise) && <View style={styles.step} />}
      {([1, 0] as const).map(side => <View key={side} style={StyleSheet.absoluteFill}>
        {[pose.legs[side], pose.arms[side]].map((chain, index) => <View key={index} style={StyleSheet.absoluteFill}>
          <Bone a={chain[0]} b={chain[1]} color={index === 0 ? kit : skin} width={index === 0 ? 14 : 10} opacity={side === 1 ? .55 : 1} />
          <Bone a={chain[1]} b={chain[2]} color={skin} width={index === 0 ? 11 : 9} opacity={side === 1 ? .55 : 1} />
          {index === 0 && <Bone a={chain[2]} b={{ x: chain[2].x + 10, y: chain[2].y }} color={kit} width={9} />}
          {index === 1 && (pose.equipment === 'weights' || /press|fly/i.test(exercise)) && <View style={{ position: 'absolute', left: chain[2].x - 7, top: chain[2].y - 5, width: 14, height: 10, borderRadius: 2, backgroundColor: '#9cabb7' }} />}
        </View>)}
      </View>)}
      <Bone a={pose.hip} b={pose.shoulder} color={kit} width={25} />
      <View style={{ position: 'absolute', left: head.x - 22, top: head.y - 23, width: 44, height: 46, overflow: 'hidden', transform: [{ rotate: `${angle + Math.PI / 2}rad` }] }}>
        {(['head', 'eyes', 'brows', 'detail', 'mouth'] as const).map(layer => <Image key={layer} source={art[layer]} contentFit="contain" style={{ position: 'absolute', width: 100, height: 100, left: -28, top: -19 }} />)}
      </View>
    </View>
    <Text numberOfLines={2} style={styles.cue}>{pose.cue}</Text>
  </View>;
}
const styles = themedStyles(() => ({
  stage: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%' },
  floor: { position: 'absolute', left: 20, right: 20, top: 190, height: 1, backgroundColor: '#60583d' },
  mat: { position: 'absolute', left: 28, right: 28, top: 183, height: 6, borderRadius: 3, backgroundColor: '#494736' },
  bench: { position: 'absolute', left: 100, top: 150, width: 108, height: 10, borderRadius: 3, backgroundColor: '#5c646a' },
  bar: { position: 'absolute', left: 130, top: 12, width: 100, height: 5, backgroundColor: '#9cabb7' },
  step: { position: 'absolute', left: 205, top: 163, width: 40, height: 26, backgroundColor: '#5c646a' },
  cue: { color: '#c9bea3', fontSize: 12, lineHeight: 16, textAlign: 'center', paddingHorizontal: 18, marginTop: 4 },
}));
