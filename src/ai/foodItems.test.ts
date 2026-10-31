import { FoodItemsError, parseFoodItems, scaleItem } from '../../supabase/functions/_shared/food-items';

// Shape Claude returns under output_config.format (structured outputs).
const response = JSON.stringify({
  items: [
    { name: 'Kananmuna, keitetty', grams: 110, kcal: 147, protein_g: 13.9, carbs_g: 0.3, fat_g: 10.1 },
    { name: 'Ruisleipä', grams: 60, kcal: 144, protein_g: 4.4, carbs_g: 26.2, fat_g: 0.8 },
    { name: 'Kahvi', grams: 200, kcal: 4, protein_g: 0.6, carbs_g: 0.6, fat_g: 0 },
    { name: 'Maito, rasvaton', grams: 30, kcal: 10, protein_g: 0.93, carbs_g: 1.47, fat_g: 0.03 },
  ],
});

describe('AI response parsing', () => {
  it('parses a structured response and rounds values', () => {
    const items = parseFoodItems(response);
    expect(items).toHaveLength(4);
    expect(items[3]).toEqual({ name: 'Maito, rasvaton', grams: 30, kcal: 10, protein_g: 0.9, carbs_g: 1.5, fat_g: 0 });
  });

  it('accepts an already-parsed object (the Edge Function response)', () => {
    expect(parseFoodItems(JSON.parse(response))).toHaveLength(4);
  });

  it('rejects output that is not JSON or has no items array', () => {
    expect(() => parseFoodItems('Sure! Here are your items: …')).toThrow(FoodItemsError);
    expect(() => parseFoodItems({ foods: [] })).toThrow(FoodItemsError);
    expect(() => parseFoodItems(null)).toThrow(FoodItemsError);
  });

  it('drops invalid items instead of failing the whole response', () => {
    const items = parseFoodItems({
      items: [
        { name: '  ', grams: 100, kcal: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
        { name: 'No numbers', grams: 'lots', kcal: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
        { name: 'Zero', grams: 0, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        'garbage',
        { name: 'Ok', grams: '100,5', kcal: 50, protein_g: 1, carbs_g: 2, fat_g: 3 },
      ],
    });
    expect(items).toEqual([{ name: 'Ok', grams: 101, kcal: 50, protein_g: 1, carbs_g: 2, fat_g: 3 }]);
  });

  it('clamps negative and absurd numbers', () => {
    const [item] = parseFoodItems({ items: [{ name: 'X', grams: 999999, kcal: -5, protein_g: 5000, carbs_g: 1, fat_g: 1 }] });
    expect(item).toMatchObject({ grams: 5000, kcal: 0, protein_g: 1000 });
  });

  it('limits the number of items and the name length', () => {
    const many = { items: Array.from({ length: 50 }, () => ({ name: 'y'.repeat(200), grams: 1, kcal: 1, protein_g: 0, carbs_g: 0, fat_g: 0 })) };
    const items = parseFoodItems(many);
    expect(items).toHaveLength(30);
    expect(items[0]!.name).toHaveLength(80);
  });

  it('returns an empty list when no food was found', () => {
    expect(parseFoodItems('{"items": []}')).toEqual([]);
  });

  it('scales an item when the amount changes', () => {
    const egg = parseFoodItems(response)[0]!;
    expect(scaleItem(egg, 55)).toEqual({ name: 'Kananmuna, keitetty', grams: 55, kcal: 74, protein_g: 7, carbs_g: 0.2, fat_g: 5.1 });
  });
});
