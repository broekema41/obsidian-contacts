import {getSettings} from "src/context/sharedSettingsContext";
import {OAuthCallbackData, startServer, stopServer} from "src/sync/auth/callbackServer";
import {PlatformHttpClient} from "src/util/platformHttpClient";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { shell } = require("electron");

export interface OAuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  accessType: 'offline';
  includeGrantedScopes: boolean;
  prompt: string;
  responseType: 'code';
  codeChallengeMethod: 'S256';
  redirectUrl: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export const GOOGLE_OAUTH_CONFIG: OAuthConfig = {
  authorizationEndpoint:
    'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:
    'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/contacts'
  ],
  accessType: 'offline',
  includeGrantedScopes: true,
  prompt: 'consent',
  responseType: 'code',
  codeChallengeMethod: 'S256',
  redirectUrl: 'http://127.0.0.1:37288/oauth/callback'
};


export function buildAuthorizationUrl(
  state: string,
  codeChallenge: string
): string {
  const settings = getSettings();
  const params = new URLSearchParams({
    client_id: settings.GoogleContact.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUrl,
    response_type: GOOGLE_OAUTH_CONFIG.responseType,
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(' '),
    access_type: GOOGLE_OAUTH_CONFIG.accessType,
    include_granted_scopes:
      GOOGLE_OAUTH_CONFIG.includeGrantedScopes.toString(),
    prompt: GOOGLE_OAUTH_CONFIG.prompt,
    state,
    code_challenge: codeChallenge,
    code_challenge_method:
    GOOGLE_OAUTH_CONFIG.codeChallengeMethod
  });
  return `${GOOGLE_OAUTH_CONFIG.authorizationEndpoint}?${params}`;
}

export async function generatePkceCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  const digest = await crypto.subtle.digest('SHA-256', data);

  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generatePkceCodeVerifier(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const random = new Uint8Array(length);

  crypto.getRandomValues(random);

  return Array.from(random)
    .map((byte) => chars[byte % chars.length])
    .join('');
}


async function exchangeCodeForToken(
  code: string,
  verifier: string
): Promise<TokenResponse> {
  const settings = getSettings();
  const response = await PlatformHttpClient.request({
      url: GOOGLE_OAUTH_CONFIG.tokenEndpoint,
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: settings.GoogleContact.clientId,
        code,
        client_secret: settings.GoogleContact.clientSecret,
        redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUrl,
        code_verifier: verifier
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Token exchange failed (${response.status}): ${response.data}`
    );
  }

  return JSON.parse(response.data) as TokenResponse;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function login(): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const codeVerifier = generatePkceCodeVerifier();
        const codeChallenge = await generatePkceCodeChallenge(codeVerifier);
        const state = crypto.randomUUID();
        const authUrl = buildAuthorizationUrl(state, codeChallenge);

        startServer(async (data: OAuthCallbackData) => {
          try {
            stopServer();

            if (!data.code) {
              throw new Error("OAuth callback did not include a code.");
            }

            const tokens = await exchangeCodeForToken(data.code, codeVerifier);

            resolve({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token ?? "",
              expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
            });
          } catch (err) {
            reject(err);
          }
        });

        await shell.openExternal(authUrl);
      } catch (err) {
        stopServer();
        reject(err);
      }
    };

    void run();
  });
}
