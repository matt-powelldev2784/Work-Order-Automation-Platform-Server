import Fastify from 'fastify'
import cors from '@fastify/cors'
import 'dotenv/config'
import { TODO_AUTH_CHECK } from './routerHandlers/auth.js'
import { postJob } from './routerHandlers/job.post.js'

export const app = Fastify({ logger: true })
await app.register(cors, { origin: true })

const port = Number(process.env.PORT)
if (Number.isNaN(port)) throw new Error('Invalid PORT')

app.get('/test', async () => ({ server_status: 'ok' }))

app.route({
  method: 'POST',
  url: '/job',
  preHandler: TODO_AUTH_CHECK,
  handler: postJob,
})

try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
