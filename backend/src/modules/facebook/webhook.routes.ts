import { Router } from 'express'
import { receiveWebhookHandler, verifyWebhookHandler } from './webhook.controller.js'

const router = Router()

router.get('/', verifyWebhookHandler)
router.post('/', receiveWebhookHandler)

export default router
