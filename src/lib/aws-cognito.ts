/**
 * AWS Cognito Authentication Client
 * Replaces Supabase Auth
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
  ChangePasswordCommand,
  GlobalSignOutCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_ssisECEGa';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '1qfsl4aufgpe358tsv264ou8ea';

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

export interface CognitoUser {
  id: string;
  email: string;
  email_verified: boolean;
  name?: string;
  phone_number?: string;
  'custom:role'?: string;
  'custom:organizationId'?: string;
}

export interface CognitoSession {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_at: number;
  user: CognitoUser;
}

class CognitoAuthClient {
  private session: CognitoSession | null = null;

  constructor() {
    this.loadSession();
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ session: CognitoSession | null; error: Error | null }> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await cognitoClient.send(command);

      if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        // Store challenge session for password change
        sessionStorage.setItem('new_password_session', response.Session || '');
        sessionStorage.setItem('new_password_username', email);

        return {
          session: null,
          error: new Error('NEW_PASSWORD_REQUIRED'),
        };
      }

      if (response.ChallengeName === 'SMS_MFA' || response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
        // Store challenge session for MFA
        sessionStorage.setItem('mfa_session', response.Session || '');
        sessionStorage.setItem('mfa_challenge', response.ChallengeName);

        return {
          session: null,
          error: new Error('MFA_REQUIRED'),
        };
      }

      if (!response.AuthenticationResult) {
        throw new Error('No authentication result returned');
      }

      const session = await this.createSession(response.AuthenticationResult);
      this.saveSession(session);

      return { session, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        session: null,
        error: error instanceof Error ? error : new Error('Sign in failed'),
      };
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(code: string): Promise<{ session: CognitoSession | null; error: Error | null }> {
    try {
      const mfaSession = sessionStorage.getItem('mfa_session');
      const challengeName = sessionStorage.getItem('mfa_challenge');

      if (!mfaSession || !challengeName) {
        throw new Error('No MFA session found');
      }

      const command = new RespondToAuthChallengeCommand({
        ClientId: CLIENT_ID,
        ChallengeName: challengeName as any,
        Session: mfaSession,
        ChallengeResponses: {
          [challengeName === 'SMS_MFA' ? 'SMS_MFA_CODE' : 'SOFTWARE_TOKEN_MFA_CODE']: code,
        },
      });

      const response = await cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new Error('MFA verification failed');
      }

      const session = await this.createSession(response.AuthenticationResult);
      this.saveSession(session);

      // Clear MFA session
      sessionStorage.removeItem('mfa_session');
      sessionStorage.removeItem('mfa_challenge');

      return { session, error: null };
    } catch (error) {
      return {
        session: null,
        error: error instanceof Error ? error : new Error('MFA verification failed'),
      };
    }
  }

  /**
   * Respond to NEW_PASSWORD_REQUIRED challenge
   */
  async setNewPassword(newPassword: string, userAttributes?: { name?: string }): Promise<{ session: CognitoSession | null; error: Error | null }> {
    try {
      const challengeSession = sessionStorage.getItem('new_password_session');
      const username = sessionStorage.getItem('new_password_username');

      console.log('setNewPassword called with:', {
        hasSession: !!challengeSession,
        sessionLength: challengeSession?.length,
        username,
        hasName: !!userAttributes?.name
      });

      if (!challengeSession || !username) {
        throw new Error('No password change session found. Please go back and login again.');
      }

      const challengeResponses: Record<string, string> = {
        USERNAME: username,
        NEW_PASSWORD: newPassword,
      };

      // Add user attributes if provided (required by some Cognito configurations)
      if (userAttributes?.name) {
        challengeResponses['userAttributes.name'] = userAttributes.name;
      }

      console.log('Challenge responses:', challengeResponses);

      const command = new RespondToAuthChallengeCommand({
        ClientId: CLIENT_ID,
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        Session: challengeSession,
        ChallengeResponses: challengeResponses,
      });

      const response = await cognitoClient.send(command);

      console.log('Cognito response:', {
        hasAuthResult: !!response.AuthenticationResult,
        challengeName: response.ChallengeName,
        session: response.Session ? 'exists' : 'none',
        response
      });

      // Check if there's another challenge (like MFA)
      if (response.ChallengeName) {
        if (response.ChallengeName === 'SMS_MFA' || response.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
          sessionStorage.setItem('mfa_session', response.Session || '');
          sessionStorage.setItem('mfa_challenge', response.ChallengeName);
          return {
            session: null,
            error: new Error('MFA_REQUIRED'),
          };
        }
        if (response.ChallengeName === 'MFA_SETUP') {
          sessionStorage.setItem('mfa_session', response.Session || '');
          sessionStorage.setItem('mfa_challenge', 'MFA_SETUP');
          return {
            session: null,
            error: new Error('MFA_SETUP_REQUIRED'),
          };
        }
        throw new Error(`Unexpected challenge: ${response.ChallengeName}`);
      }

      if (!response.AuthenticationResult) {
        throw new Error('Password change failed - no authentication result');
      }

      const session = await this.createSession(response.AuthenticationResult);
      this.saveSession(session);

      // Clear password change session
      sessionStorage.removeItem('new_password_session');
      sessionStorage.removeItem('new_password_username');

      return { session, error: null };
    } catch (error: any) {
      console.error('setNewPassword error details:', {
        name: error.name,
        message: error.message,
        code: error.$metadata?.httpStatusCode,
        raw: error
      });
      return {
        session: null,
        error: error instanceof Error ? error : new Error('Password change failed'),
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      if (this.session?.access_token) {
        const command = new GlobalSignOutCommand({
          AccessToken: this.session.access_token,
        });
        await cognitoClient.send(command);
      }

      this.session = null;
      localStorage.removeItem('cognito_session');
      sessionStorage.clear();

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Sign out failed'),
      };
    }
  }

  /**
   * Get current user
   */
  async getUser(): Promise<{ user: CognitoUser | null; error: Error | null }> {
    try {
      if (!this.session?.access_token) {
        return { user: null, error: new Error('No active session') };
      }

      // Check if token is expired
      if (Date.now() >= this.session.expires_at) {
        // Try to refresh
        const refreshed = await this.refreshSession();
        if (!refreshed) {
          return { user: null, error: new Error('Session expired') };
        }
      }

      const command = new GetUserCommand({
        AccessToken: this.session.access_token,
      });

      const response = await cognitoClient.send(command);

      const user = this.parseUserAttributes(response.UserAttributes || []);

      return { user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error : new Error('Get user failed'),
      };
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
      });

      await cognitoClient.send(command);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Password reset failed'),
      };
    }
  }

  /**
   * Confirm password reset with code
   */
  async confirmPasswordReset(email: string, code: string, newPassword: string): Promise<{ error: Error | null }> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      await cognitoClient.send(command);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Password reset confirmation failed'),
      };
    }
  }

  /**
   * Change password (when logged in)
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ error: Error | null }> {
    try {
      if (!this.session?.access_token) {
        throw new Error('No active session');
      }

      const command = new ChangePasswordCommand({
        AccessToken: this.session.access_token,
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword,
      });

      await cognitoClient.send(command);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Password change failed'),
      };
    }
  }

  /**
   * Get current session
   */
  getSession(): CognitoSession | null {
    return this.session;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.session !== null && Date.now() < this.session.expires_at;
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.session?.access_token || null;
  }

  // Private helper methods

  private async createSession(authResult: any): Promise<CognitoSession> {
    const user = this.decodeJWT(authResult.IdToken);

    return {
      access_token: authResult.AccessToken,
      id_token: authResult.IdToken,
      refresh_token: authResult.RefreshToken,
      expires_at: Date.now() + (authResult.ExpiresIn * 1000),
      user,
    };
  }

  private decodeJWT(token: string): CognitoUser {
    const payload = JSON.parse(atob(token.split('.')[1]));

    return {
      id: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified === 'true' || payload.email_verified === true,
      name: payload.name,
      phone_number: payload.phone_number,
      'custom:role': payload['custom:role'],
      'custom:organizationId': payload['custom:organizationId'],
    };
  }

  private parseUserAttributes(attributes: any[]): CognitoUser {
    const attrs: Record<string, string> = {};
    attributes.forEach(attr => {
      attrs[attr.Name] = attr.Value;
    });

    return {
      id: attrs.sub,
      email: attrs.email,
      email_verified: attrs.email_verified === 'true',
      name: attrs.name,
      phone_number: attrs.phone_number,
      'custom:role': attrs['custom:role'],
      'custom:organizationId': attrs['custom:organizationId'],
    };
  }

  private saveSession(session: CognitoSession): void {
    this.session = session;
    localStorage.setItem('cognito_session', JSON.stringify(session));
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem('cognito_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (Date.now() < session.expires_at) {
          this.session = session;
        } else {
          localStorage.removeItem('cognito_session');
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      localStorage.removeItem('cognito_session');
    }
  }

  private async refreshSession(): Promise<boolean> {
    try {
      if (!this.session?.refresh_token) {
        return false;
      }

      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: this.session.refresh_token,
        },
      });

      const response = await cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        return false;
      }

      const session = await this.createSession({
        ...response.AuthenticationResult,
        RefreshToken: this.session.refresh_token, // Reuse existing refresh token
      });

      this.saveSession(session);
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cognitoAuth = new CognitoAuthClient();

// Export type
export type { CognitoAuthClient };
