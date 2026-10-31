import { planSets, shouldIncrease, type SetLike } from './progression';

const set = (weight_kg: number, reps: number, is_warmup: 0 | 1 = 0): SetLike => ({ weight_kg, reps, is_warmup });
const bench = { repMin: 5, repMax: 8 };

describe('progression rule', () => {
  it('increases only when every working set hit the top of the range', () => {
    expect(shouldIncrease([set(80, 8), set(80, 8), set(80, 9)], 8)).toBe(true);
    expect(shouldIncrease([set(80, 8), set(80, 8), set(80, 7)], 8)).toBe(false);
    expect(shouldIncrease([], 8)).toBe(false);
  });

  it('adds one increment and resets reps to the bottom of the range', () => {
    const plan = planSets([set(80, 8), set(80, 8), set(80, 8)], bench, 2.5);
    expect(plan.increased).toBe(true);
    expect(plan.sets).toEqual([set(82.5, 5), set(82.5, 5), set(82.5, 5)]);
  });

  it('repeats last session when the top was not reached', () => {
    const plan = planSets([set(80, 8), set(80, 7), set(80, 6)], bench, 2.5);
    expect(plan.increased).toBe(false);
    expect(plan.sets).toEqual([set(80, 8), set(80, 7), set(80, 6)]);
  });

  it('ignores warm-ups for the decision but keeps them in the plan', () => {
    const plan = planSets([set(40, 10, 1), set(80, 8), set(80, 8)], bench, 2.5);
    expect(plan.increased).toBe(true);
    expect(plan.sets).toEqual([set(40, 10, 1), set(82.5, 5), set(82.5, 5)]);
  });

  it('does not progress when only warm-ups were done', () => {
    expect(planSets([set(40, 10, 1)], bench, 2.5).increased).toBe(false);
  });

  it('defaults to 3 empty sets the first time', () => {
    expect(planSets([], bench, 2.5)).toEqual({ sets: [set(0, 5), set(0, 5), set(0, 5)], increased: false });
  });

  it('avoids floating point drift with imperial increments', () => {
    const fiveLb = 5 * 0.45359237;
    const plan = planSets([set(61.235, 8)], bench, fiveLb);
    expect(plan.sets[0]!.weight_kg).toBe(63.503);
  });
});
