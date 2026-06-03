import { isTokenResponse } from './user.model';

describe('isTokenResponse', () => {
  it('should return true for a valid TokenResponse', () => {
    expect(isTokenResponse({
      accessToken: 'abc',
      refreshToken: 'xyz',
      expiresIn: 3600,
      user: { id: 1, email: 'a@b.com', displayName: 'Test', provider: 'google', selectedSeriesId: 1 }
    })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isTokenResponse(null)).toBe(false);
  });

  it('should return false when accessToken is missing', () => {
    expect(isTokenResponse({ refreshToken: 'xyz', expiresIn: 3600, user: {} })).toBe(false);
  });

  it('should return false when refreshToken is not a string', () => {
    expect(isTokenResponse({ accessToken: 'abc', refreshToken: 42, expiresIn: 3600, user: {} })).toBe(false);
  });

  it('should return false for a plain string', () => {
    expect(isTokenResponse('token')).toBe(false);
  });
});
