import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { serve } from '@hono/node-server'
import { healthRoute } from './routes/health'
import { configRoute } from './routes/config'
import { generateBriefRoute } from './routes/generate-brief'
import { exportRoute } from './routes/export'

const app = new Hono()

app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  })
)

app.route('/', healthRoute)
app.route('/config', configRoute)
app.route('/api', generateBriefRoute)
app.route('/api', exportRoute)

const port = parseInt(process.env.PORT || '3001')

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 API server running on http://localhost:${info.port}`)
  }
)
