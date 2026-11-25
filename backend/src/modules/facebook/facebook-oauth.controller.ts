import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import {
  exchangeFacebookOAuthCode,
  selectFacebookOAuthPage,
  startFacebookOAuth,
} from './facebook-oauth.service.js'
import {
  facebookOAuthExchangeSchema,
  facebookOAuthSelectPageSchema,
} from './facebook.validation.js'
import { handleFacebookError } from './facebook.controller.js'

function getUserId(req: Request): number {
  const userId = (req as AuthenticatedRequest).user?.id
  if (!userId) throw new Error('Authenticated user not found')
  return userId
}

export async function getFacebookOAuthUrlHandler(req: Request, res: Response) {
  try {
    const result = await startFacebookOAuth(getUserId(req))
    return res.status(200).json({ success: true, data: result })
  } catch (error) {
    return handleFacebookError(res, error)
  }
}

export async function exchangeFacebookOAuthHandler(req: Request, res: Response) {
  try {
    const input = facebookOAuthExchangeSchema.parse(req.body ?? {})
    const result = await exchangeFacebookOAuthCode(getUserId(req), input.code, input.state)
    return res.status(200).json({ success: true, data: result })
  } catch (error) {
    return handleFacebookError(res, error)
  }
}

export async function selectFacebookOAuthPageHandler(req: Request, res: Response) {
  try {
    const input = facebookOAuthSelectPageSchema.parse(req.body ?? {})
    const result = await selectFacebookOAuthPage(getUserId(req), input.sessionId, input.pageId)
    return res.status(200).json({
      success: true,
      message: result.install.success
        ? 'Facebook Page connected and leadgen webhook subscribed.'
        : 'Facebook Page connected, but webhook subscription needs attention.',
      data: result,
    })
  } catch (error) {
    return handleFacebookError(res, error)
  }
}
