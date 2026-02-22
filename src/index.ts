import Fastify from 'fastify'
import cors from '@fastify/cors'
import 'dotenv/config'

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })

app.get('/test', async () => ({ server_status: 'ok' }))

const port = Number(process.env.PORT)

if (Number.isNaN(port)) throw new Error('Invalid PORT')

try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
