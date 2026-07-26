import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { AutenticacinService, LoginRequest, LoginResponse } from '../../generated-api';

const STORAGE_KEY = 'inventhh.session';

export interface AuthSession {
  token: string;
  username: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly autenticacinService = inject(AutenticacinService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _session = signal<AuthSession | null>(this.readSession());

  readonly session = this._session.asReadonly();
  readonly isAdmin = computed(() => this._session()?.rol === 'ADMIN');

  login(username: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = { username, password };
    return this.autenticacinService.login(body).pipe(tap((response) => this.setSession(response)));
  }

  logout(): void {
    this._session.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  isAuthenticated(): boolean {
    return this._session() !== null;
  }

  getRol(): string | null {
    return this._session()?.rol ?? null;
  }

  getToken(): string | null {
    return this._session()?.token ?? null;
  }

  private setSession(response: LoginResponse): void {
    const session: AuthSession = {
      token: String(response.token),
      username: String(response.username),
      rol: String(response.rol),
    };
    this._session.set(session);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  private readSession(): AuthSession | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
}
