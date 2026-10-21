import { Router } from 'express'
import { login, me, logout } from './auth.controller.js'
import { authenticateToken } from './auth.middleware.js'

const router = Router()

router.post('/login', login)

router.get('/me', authenticateToken, me)
router.post('/logout', authenticateToken, logout)

export default router