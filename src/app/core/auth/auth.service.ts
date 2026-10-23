import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, firstValueFrom, of, tap } from 'rxjs';
import type { components } from '../../api/schema';
import { ApiClient } from '../http/api-client';
import {
  Session,
  TokenResponse,
  isAccessTokenExpiring,
  isRefreshTokenExpired,
  toSession,
} from './session';
import { TokenRefresher } from './token-refresher';
import { TokenStore } from './token-store';

export type CurrentUser = components['schemas']['UserViewModel'];

/** Who is signed in; ending the session; picking it up again after a page reload. Sign-in forms call {@link startSession}. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly store = inject(TokenStore);
  private readonly refresher = inject(TokenRefresher);

  private readonly user = signal<CurrentUser | null>(null);

  /** True while the user themself is leaving, so the "your session expired" redirect stays quiet. */
  private leaving = false;

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.store.session() !== null);
  readonly displayName = computed(() => this.user()?.fullName || this.user()?.login || '');
  /** True once the account is bound to an E-IMZO key (`INDIVIDUAL` or `LEGAL`): only those may apply to an auction. */
  readonly isVerified = computed(() => {
    const type = this.user()?.type;
    return type === 'INDIVIDUAL' || type === 'LEGAL';
  });

  get isLeaving(): boolean {
    return this.leaving;
  }

  /** Keeps the tokens a sign-in, sign-up or password change returned. */
  startSession(token: TokenResponse): void {
    this.leaving = false;
    this.store.set(toSession(token));
  }

  /** Keeps a profile the server just returned (after the person edited it). */
  setUser(user: CurrentUser): void {
    this.user.set(user);
  }

  /** Loads the profile (name, type, e-mail) of the signed-in user. */
  loadProfile(): Observable<CurrentUser | null> {
    return this.api.get<CurrentUser>('api/Auth/me').pipe(
      tap((user) => this.user.set(user)),
      catchError(() => of(null)),
    );
  }

  /** Ends the session on the server (best effort) and on this device; other tabs notice through the storage event. */
  signOut(): Observable<unknown> {
    this.leaving = true;
    const refreshToken = this.store.session()?.refreshToken;
    const request$ = refreshToken
      ? this.api.post('api/Auth/logout', { refreshToken }, { skipAuth: true })
      : of(null);
    return request$.pipe(
      catchError(() => of(null)),
      finalize(() => {
        this.store.clear();
        this.user.set(null);
      }),
    );
  }

  /**
   * At application start in the browser: a stored session whose refresh token is already dead is dropped; one whose access
   * token is (nearly) dead is renewed now. Then the profile is loaded.
   */
  async restore(): Promise<void> {
    const session: Session | null = this.store.reload();
    if (!session) return;
    if (isRefreshTokenExpired(session)) {
      this.store.clear();
      return;
    }
    if (isAccessTokenExpiring(session)) {
      try {
        await firstValueFrom(this.refresher.refresh(session.refreshToken));
      } catch {
        // Refused: the store was cleared. Network down: the session stays, the first call retries.
      }
    }
    if (this.store.session()) await firstValueFrom(this.loadProfile());
  }
}
