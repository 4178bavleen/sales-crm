import crypto from 'node:crypto'
import { env } from '../../config/env.js'
import { prisma } from '../../config/database.js'
import { FacebookServiceError, getFacebookSettings, getFacebookSettingsRecord } from './facebook.service.js'

const GRAPH_BASE = 'https://graph.facebook.com/v27.0'
const OAUTH_DIALOG = 'https://www.facebook.com/v27.0/dialog/oauth'
const SESSION_TTL_MS = 10 * 60 * 1000
const OAUTH_SCOPES = [
  'leads_retrieval',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'ads_management',
  'pages_manage_ads',
]

type OAuthSession = {
  userId: number
  appId: string
  appSecret: string
  expiresAt: number
  pages: Map<string, string>
}

const sessions = new Map<string, OAuthSession>()

function purgeExpiredSessions() {
  const now = Date.now()
  for (const [state, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(state)
  }
}

function graphUrl(path: string, params: Record<string, string>) {
  return `${GRAPH_BASE}/${path}?${new URLSearchParams(params).toString()}`
}

async function graphRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const result: any = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      result?.error?.message ||
      result?.error?.error_user_msg ||
      `Meta API responded with HTTP status ${response.status}`
    throw new FacebookServiceError(message, response.status >= 500 ? 502 : 400)
  }
  return result as T
}

export function getFacebookOAuthRedirectUri() {
  return `${env.FRONTEND_URL.replace(/\/+$/, '')}/settings/facebook/callback`
}

function buildOAuthUrl(state: string, appId: string) {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getFacebookOAuthRedirectUri(),
    response_type: 'code',
    scope: OAUTH_SCOPES.join(','),
    state,
  })
  return `${OAUTH_DIALOG}?${params.toString()}`
}

function getSession(state: string, userId: number) {
  purgeExpiredSessions()
  const session = sessions.get(state)
  if (!session) {
    throw new FacebookServiceError('Facebook connection session expired. Please try again.', 400)
  }
  if (session.userId !== userId) {
    throw new FacebookServiceError('This Facebook connection request belongs to another user.', 403)
  }
  return session
}

export async function startFacebookOAuth(userId: number) {
  const settings = await getFacebookSettingsRecord()
  const appId = settings.appId.trim()
  const appSecret = settings.appSecret.trim()
  if (!appId || !appSecret) {
    throw new FacebookServiceError('Save App ID and App Secret before connecting with Facebook.', 400)
  }

  const state = crypto.randomBytes(24).toString('hex')
  sessions.set(state, {
    userId,
    appId,
    appSecret,
    expiresAt: Date.now() + SESSION_TTL_MS,
    pages: new Map(),
  })

  return {
    state,
    url: buildOAuthUrl(state, appId),
    redirectUri: getFacebookOAuthRedirectUri(),
  }
}

export async function exchangeFacebookOAuthCode(userId: number, code: string, state: string) {
  const session = getSession(state, userId)
  const redirectUri = getFacebookOAuthRedirectUri()

  const shortLived = await graphRequest<{ access_token?: string }>(
    graphUrl('oauth/access_token', {
      client_id: session.appId,
      client_secret: session.appSecret,
      redirect_uri: redirectUri,
      code,
    }),
  )
  if (!shortLived.access_token) {
    throw new FacebookServiceError('Meta did not return an access token for this code.', 400)
  }

  const longLived = await graphRequest<{ access_token?: string }>(
    graphUrl('oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: session.appId,
      client_secret: session.appSecret,
      fb_exchange_token: shortLived.access_token,
    }),
  )
  const userAccessToken = longLived.access_token || shortLived.access_token

  const [user, accounts] = await Promise.all([
    graphRequest<{ id?: string; name?: string }>(
      graphUrl('me', { fields: 'id,name', access_token: userAccessToken }),
    ),
    graphRequest<{ data?: Array<{ id: string; name?: string; access_token?: string }> }>(
      graphUrl('me/accounts', { fields: 'id,name,access_token', access_token: userAccessToken }),
    ),
  ])

  const pages = (accounts.data ?? [])
    .filter((page) => page.id && page.access_token)
    .map((page) => ({ id: String(page.id), name: String(page.name ?? `Page ${page.id}`) }))

  for (const page of accounts.data ?? []) {
    if (page.id && page.access_token) session.pages.set(String(page.id), String(page.access_token))
  }

  if (!pages.length) {
    throw new FacebookServiceError(
      'No Facebook Pages with lead access were found for this account. Use an account that can advertise on the Page.',
      400,
    )
  }

  return {
    sessionId: state,
    user: { id: user.id ?? null, name: user.name ?? null },
    pages,
  }
}

export async function selectFacebookOAuthPage(userId: number, sessionId: string, pageId: string) {
  const session = getSession(sessionId, userId)
  const pageAccessToken = session.pages.get(pageId)
  if (!pageAccessToken) {
    throw new FacebookServiceError('This Page is no longer available in the connection session. Please reconnect.', 400)
  }

  const settings = await getFacebookSettingsRecord()
  await prisma.facebookSetting.update({
    where: { id: settings.id },
    data: {
      appId: session.appId,
      appSecret: session.appSecret,
      pageId,
      pageAccessToken,
    },
  })

  sessions.delete(sessionId)

  let install = { success: false, message: 'App could not be installed on the Page.' }
  try {
    const response = await fetch(
      graphUrl('subscribed_apps', {
        subscribed_fields: 'leadgen',
        access_token: pageAccessToken,
      }),
      { method: 'POST' },
    )
    const result: any = await response.json().catch(() => null)
    if (response.ok && result?.success === true) {
      install = { success: true, message: 'App installed on the Page and leadgen webhook subscribed.' }
    } else {
      install = {
        success: false,
        message: result?.error?.message || `Meta returned HTTP status ${response.status}`,
      }
    }
  } catch (error) {
    install = {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown installation error',
    }
  }

  return { settings: await getFacebookSettings(), install }
}
