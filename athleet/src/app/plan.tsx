import { Redirect, useLocalSearchParams } from 'expo-router';
import type { PlanParams } from '@/components/plan-view';

export default function PlanScreen() {
  const params = useLocalSearchParams<PlanParams>();
  return <Redirect href={{ pathname: '/chat/[id]', params: { ...params, id: params.coachId ?? 'atlas', view: 'plan' } }} />;
}
