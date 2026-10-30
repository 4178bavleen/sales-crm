import app from './app.js'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { initReminderScheduler } from './common/services/reminder-scheduler.service.js'

async function startServer(): Promise<void> {
  await connectDatabase()

  initReminderScheduler()

  app.listen(env.PORT, () => {
    console.log(`Sales CRM API running on port ${env.PORT}`)
  })
}

startServer().catch((error: unknown) => {
  console.error('Failed to start API:', error)
  process.exit(1)
})