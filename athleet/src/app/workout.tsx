import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSelectedPlan } from '@/lib/selected-plan';

export default function WorkoutScreen() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  const selected = useSelectedPlan();
  return <Redirect href={{ pathname: '/chat/[id]', params: { id: selected?.coachId ?? 'atlas', view: selected ? 'workout' : 'plan', day: day ?? '0' } }} />;
}
