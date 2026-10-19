
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { env } from './config/env.js'
import { notFoundMiddleware } from './common/middleware/not-found.middleware.js'
import { errorMiddleware } from './common/middleware/error.middleware.js'

const app = express()

app.disable('x-powered-by')

app.use(helmet())

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sales CRM API is running',
  })
})

app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
