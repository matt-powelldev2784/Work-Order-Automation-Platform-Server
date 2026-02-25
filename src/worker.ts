import 'dotenv/config'
import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { prisma } from './lib/prisma.js'
import { jobQueueName, type JobQueuePayload } from './lib/redis.js'

console.log('[worker] started')

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error('Missing Redis connection settings. Set REDIS_URL.')
}

const workerConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
})

const worker = new Worker<JobQueuePayload>(
  jobQueueName,
  async (job) => {
    const { jobId } = job.data

    await prisma.job.update({
      where: { id: jobId },
      data: { jobSheetStatus: 'processing' },
    })

    try {
      await prisma.job.update({
        where: { id: jobId },
        data: { jobSheetStatus: 'ready' },
      })
    } catch (error) {
      await prisma.job.update({
        where: { id: jobId },
        data: { jobSheetStatus: 'failed' },
      })
      throw error
    }
  },
  {
    connection: workerConnection,
  },
)

worker.on('completed', (job) => {
  console.log(`[worker] completed job ${job.id}`)
})

worker.on('failed', (job, error) => {
  console.error(`[worker] failed job ${job?.id ?? 'unknown'}`, error)
})

const shutdown = async () => {
  console.log('[worker] shutting down')
  await worker.close()
  await workerConnection.quit()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})
