import type { NutritionTargets, UserProfile } from '@/lib/types';

// Calorie and macro targets computed in code so numbers are consistent.
// Same math as server/nutrition.ts.
/** `calorieFactor` scales calories for demanding positions (e.g. 1.1 for a lineman). */
export function computeTargets(p: UserProfile, calorieFactor = 1): NutritionTargets {
  if (p.age < 18) {
    return {
      showNumbers: false,
      note: 'You are still growing, so no calorie targets or dieting. Eat regular balanced meals with protein, fruit and veg, and drink plenty of water.',
    };
  }

  // Mifflin-St Jeor BMR
  const sexOffset = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + sexOffset;
  const activity = p.daysPerWeek <= 2 ? 1.375 : p.daysPerWeek <= 4 ? 1.55 : 1.725;
  const maintenance = bmr * activity;

  let calories = maintenance;
  let proteinPerKg = 1.6;
  let note = 'Maintenance calories to fuel training.';

  switch (p.goal) {
    case 'lose_fat':
    case 'cut':
      calories = maintenance - Math.min(500, maintenance * 0.2);
      proteinPerKg = 2.0;
      note = 'Moderate deficit with high protein to keep muscle.';
      break;
    case 'bulk':
      calories = maintenance + 300;
      proteinPerKg = 1.8;
      note = 'Small surplus for steady weight gain.';
      break;
    case 'build_muscle':
      calories = maintenance + 150;
      proteinPerKg = 1.8;
      note = 'Slight surplus for lean muscle gain.';
      break;
    case 'get_stronger':
    case 'sport_performance':
      proteinPerKg = 1.8;
      note = 'Fuel performance at maintenance.';
      break;
  }

  if (calorieFactor !== 1) {
    calories *= calorieFactor;
    note += calorieFactor > 1 ? ' Adjusted up for the extra work your role demands.' : ' Adjusted down slightly: your role involves less running.';
  }

  const floor = p.sex === 'female' ? 1200 : 1500;
  calories = Math.max(floor, Math.round(calories / 10) * 10);
  const proteinG = Math.round(proteinPerKg * p.weightKg);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { showNumbers: true, calories, proteinG, carbsG, fatG, note };
}
