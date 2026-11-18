import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { exerciseRig, type Point } from '@/lib/exercise-rig';
import type { Coach } from '@/lib/types';
import { COACH_LOOKS, coachArt } from './coach-art';
import { useReduceMotion } from '@/lib/appearance';
import { themedStyles } from '@/lib/theme';

function Bone({ a, b, color, width, opacity = 1 }: { a: Point; b: Point; color: string; width: number; opacity?: number }) {
  return <View style={{ position: 'absolute', left: a.x - width / 2, top: a.y - width / 2, width: Math.hypot(b.x - a.x, b.y - a.y) + width, height: width, borderRadius: width / 2, backgroundColor: color, opacity, transformOrigin: `${width / 2}px 50%`, transform: [{ rotate: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` }] }} />;
}
/** A racket held in the hand, pointing along the forearm. */
function Racket({ elbow, hand }: { elbow: Point; hand: Point }) {
  const angle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
  const at = (length: number) => ({ x: hand.x + Math.cos(angle) * length, y: hand.y + Math.sin(angle) * length });
  const head = at(24);
  return <>
    <Bone a={hand} b={at(12)} color="#d9d4c5" width={3} />
    <View style={{ position: 'absolute', left: head.x - 12, top: head.y - 8, width: 24, height: 16, borderRadius: 12, borderWidth: 3, borderColor: '#d9d4c5', transform: [{ rotate: `${angle}rad` }] }} />
  </>;
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
  const { skin, kit } = COACH_LOOKS[coach.id] ?? COACH_LOOKS.atlas;
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
      {pose.equipment === 'box' && <View style={styles.box} />}
      {pose.equipment === 'handbench' && <View style={styles.handbench} />}
      {pose.equipment === 'wall' && <View style={styles.wall} />}
      {pose.equipment === 'climber' && <View style={styles.climber} />}
      {pose.equipment === 'roller' && <View style={styles.roller} />}
      {pose.equipment === 'bag' && <><View style={styles.bagChain} /><View style={styles.bag} /></>}
      {pose.equipment === 'sled' && <><View style={styles.sledPost} /><View style={styles.sled} /></>}
      {pose.equipment === 'ladder' && <>{[0, 1].map(rail => <View key={rail} style={[styles.ladderRail, { top: 184 + rail * 5 }]} />)}{[0, 1, 2, 3, 4, 5].map(rung => <View key={rung} style={[styles.ladderRung, { left: 110 + rung * 30 }]} />)}</>}
      {pose.equipment === 'cones' && [244, 300].map(x => <View key={x} style={[styles.cone, { left: x }]} />)}
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
      {pose.racket && <Racket elbow={pose.arms[0][1]} hand={pose.arms[0][2]} />}
      {pose.prop && <View style={[styles.ball, pose.prop.kind === 'medball' && styles.medball, { left: pose.prop.at.x - (pose.prop.kind === 'medball' ? 9 : 6), top: pose.prop.at.y - (pose.prop.kind === 'medball' ? 9 : 6) }]} />}
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
  box: { position: 'absolute', left: 214, top: 152, width: 48, height: 38, borderRadius: 3, backgroundColor: '#5c646a' },
  handbench: { position: 'absolute', left: 112, top: 150, width: 72, height: 40, borderRadius: 3, backgroundColor: '#5c646a' },
  wall: { position: 'absolute', left: 312, top: 30, width: 10, height: 160, backgroundColor: '#5c646a' },
  climber: { position: 'absolute', left: 214, top: 0, width: 6, height: 190, borderRadius: 3, backgroundColor: '#9cabb7' },
  roller: { position: 'absolute', left: 203, top: 167, width: 18, height: 18, borderRadius: 9, backgroundColor: '#3f6f86' },
  bagChain: { position: 'absolute', left: 250, top: 0, width: 2, height: 22, backgroundColor: '#9cabb7' },
  bag: { position: 'absolute', left: 238, top: 22, width: 26, height: 92, borderRadius: 10, backgroundColor: '#8a3b2f' },
  sledPost: { position: 'absolute', left: 260, top: 100, width: 5, height: 30, backgroundColor: '#9cabb7' },
  sled: { position: 'absolute', left: 262, top: 128, width: 56, height: 57, borderRadius: 3, backgroundColor: '#5c646a' },
  ladderRail: { position: 'absolute', left: 110, width: 150, height: 2, backgroundColor: '#c9a227' },
  ladderRung: { position: 'absolute', top: 184, width: 2, height: 7, backgroundColor: '#c9a227' },
  cone: { position: 'absolute', top: 176, width: 10, height: 14, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: '#e67e22' },
  ball: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#e67e22' },
  medball: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#7a6a55' },
  cue: { color: '#c9bea3', fontSize: 12, lineHeight: 16, textAlign: 'center', paddingHorizontal: 18, marginTop: 4 },
}));
