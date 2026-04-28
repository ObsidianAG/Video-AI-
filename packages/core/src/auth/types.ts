import type { Result } from '../result.js';
import type { DomainError } from '../errors.js';

export interface AuthenticatedUser {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly roles: readonly string[];
}

export interface SessionContext {
  readonly user: AuthenticatedUser;
  readonly sessionId: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

/**
 * Auth contract. Concrete implementations (Clerk, NextAuth, custom) MUST be
 * wired only on the server and MUST NOT use localStorage/sessionStorage for
 * session material.
 */
export interface AuthProvider {
  getSession(headers: Readonly<Record<string, string | undefined>>): Promise<
    Result<SessionContext | null, DomainError>
  >;

  requireSession(headers: Readonly<Record<string, string | undefined>>): Promise<
    Result<SessionContext, DomainError>
  >;
}
