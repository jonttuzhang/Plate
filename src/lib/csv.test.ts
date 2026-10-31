import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a header and quotes only when needed', () => {
    const csv = toCsv(
      [
        { name: 'Rye bread', kcal: 220 },
        { name: 'Coffee, with "milk"', kcal: null },
      ],
      ['name', 'kcal'],
    );
    expect(csv).toBe('name,kcal\r\nRye bread,220\r\n"Coffee, with ""milk""",\r\n');
  });
});
