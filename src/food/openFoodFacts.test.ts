import { parseOffProduct } from './openFoodFacts';

// Shape of https://world.openfoodfacts.org/api/v2/product/<code>.json?fields=...
const oatDrink = {
  code: '6408430000234',
  status: 1,
  product: {
    product_name: 'Kaurajuoma',
    product_name_en: 'Oat drink',
    brands: 'Valio, Oddlygood',
    serving_quantity: '250',
    nutriments: { 'energy-kcal_100g': 46, proteins_100g: 0.98, carbohydrates_100g: 6.5, fat_100g: 1.6 },
  },
};

describe('Open Food Facts parsing', () => {
  it('maps a product to a food in the user language', () => {
    expect(parseOffProduct(oatDrink, '6408430000234', 'en')).toEqual({
      name: 'Oat drink',
      brand: 'Valio',
      barcode: '6408430000234',
      kcal_100g: 46,
      protein_100g: 1,
      carbs_100g: 6.5,
      fat_100g: 1.6,
      serving_g: 250,
      source: 'off',
      source_ref: '6408430000234',
    });
    expect(parseOffProduct(oatDrink, '6408430000234', 'fi')?.name).toBe('Kaurajuoma');
  });

  it('falls back to kJ when kcal is missing', () => {
    const p = { status: 1, product: { product_name: 'X', nutriments: { energy_100g: 418.4 } } };
    expect(parseOffProduct(p, '1', 'en')?.kcal_100g).toBe(100);
  });

  it('returns null for unknown products or missing energy', () => {
    expect(parseOffProduct({ status: 0, status_verbose: 'product not found' }, '1', 'en')).toBeNull();
    expect(parseOffProduct({ status: 1, product: { product_name: 'X', nutriments: {} } }, '1', 'en')).toBeNull();
    expect(parseOffProduct(null, '1', 'en')).toBeNull();
  });

  it('uses the barcode when the product has no name', () => {
    const p = { status: 1, product: { nutriments: { 'energy-kcal_100g': '120' } } };
    expect(parseOffProduct(p, '4001', 'fi')).toMatchObject({ name: '4001', kcal_100g: 120, protein_100g: 0 });
  });
});
