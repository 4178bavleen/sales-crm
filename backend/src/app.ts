
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { requestLogger } from './common/middleware/logger.middleware.js'
import { notFoundMiddleware } from './common/middleware/not-found.middleware.js'
import { errorMiddleware } from './common/middleware/error.middleware.js'
import dealRoutes from "./modules/deals/deal.routes.js";
import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from './modules/users/user.routes.js'
import leadRoutes from './modules/leads/lead.routes.js'
import permissionRoutes from './modules/permission/permission.routes.js'
import taskRoutes from './modules/tasks/task.routes.js'
import contactRoutes from './modules/contacts/contact.routes.js'
import meetingRoutes from './modules/meetings/meeting.routes.js'
import targetRoutes from './modules/targets/target.routes.js'
import reportsRoutes from './modules/reports/reports.routes.js'
import productServiceRoutes from './modules/products-services/products-services.routes.js'
import notificationRoutes from './modules/notifications/notification.routes.js'
import customerRoutes from './modules/customers/customer.routes.js'
import activityRoutes from './modules/activities/activity.routes.js'
import auditRoutes from './modules/audit/audit.routes.js'


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
app.use(requestLogger)

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sales CRM API is running',
  })
})
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/leads', leadRoutes)
app.use('/api/v1/permissions', permissionRoutes)
app.use('/api/v1/tasks', taskRoutes)
app.use("/api/v1/deals", dealRoutes);
app.use('/api/v1/contacts', contactRoutes)
app.use('/api/v1/meetings', meetingRoutes)
app.use('/api/v1/targets', targetRoutes)
app.use('/api/v1/reports', reportsRoutes)
app.use('/api/v1/products-services', productServiceRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/customers', customerRoutes)
app.use('/api/v1/activities', activityRoutes)
app.use('/api/v1/audit-logs', auditRoutes)
app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
