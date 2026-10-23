import { readClaims } from './jwt';
import { isAccessTokenExpiring, isRefreshTokenExpired, toSession } from './session';

const encode = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('JWT claims', () => {
  it('reads the user id and role, and a single permission as a list', () => {
    const token = `h.${encode({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'u1',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Client',
      permission: 'READ_X',
    })}.s`;
    expect(readClaims(token)).toEqual({ userId: 'u1', role: 'Client', permissions: ['READ_X'] });
  });

  it('returns empty claims for garbage instead of throwing', () => {
    expect(readClaims('not-a-token')).toEqual({ userId: null, role: null, permissions: [] });
    expect(readClaims(null).userId).toBeNull();
  });
});

describe('session', () => {
  const now = Date.parse('2026-10-23T10:00:00Z');

  it('renews the access token 30 seconds before it expires', () => {
    const session = toSession({
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiration: '2026-10-23T10:00:20Z',
      refreshTokenExpiration: '2026-10-24T10:00:00Z',
    });
    expect(isAccessTokenExpiring(session, now)).toBe(true);
    expect(isAccessTokenExpiring(session, now - 60_000)).toBe(false);
    expect(isRefreshTokenExpired(session, now)).toBe(false);
  });

  it('refuses an incomplete token response', () => {
    expect(() =>
      toSession({
        accessToken: 'a',
        refreshToken: null,
        accessTokenExpiration: null,
        refreshTokenExpiration: null,
      }),
    ).toThrow();
  });
});
