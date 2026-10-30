import { progress } from './macros';

describe('progress', () => {
  it('returns ratio and what is left', () => {
    expect(progress(500, 2000)).toEqual({ ratio: 0.25, left: 1500 });
  });

  it('caps the ratio at 1 and reports overage as negative', () => {
    expect(progress(2500, 2000)).toEqual({ ratio: 1, left: -500 });
  });

  it('has no target when target is missing or zero', () => {
    expect(progress(100, null)).toEqual({ ratio: 0, left: null });
    expect(progress(100, 0)).toEqual({ ratio: 0, left: null });
  });
});
