import 'dotenv/config'
import { Job, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { prisma } from './lib/prisma.js'
import { jobSheetQueue, type JobQueuePayload } from './lib/redis.js'

const redisUrl = process.env.REDIS_URL

if (!redisUrl) throw new Error('Missing Redis connection settings. Set REDIS_URL.')

if (redisUrl) console.info('staring process job sheet generation worker...')

const workerConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
})

const updateJobStatus = (jobId: string, jobSheetStatus: 'ready' | 'failed') =>
  prisma.job.update({
    where: { id: jobId },
    data: { jobSheetStatus },
  })

const processJobSheetGeneration = async (job: Job<JobQueuePayload>) => {
  const { jobId } = job.data

  try {
    await updateJobStatus(jobId, 'ready')
  } catch (error) {
    await updateJobStatus(jobId, 'failed')
    throw error
  }
}

const worker = new Worker<JobQueuePayload>(jobSheetQueue, processJobSheetGeneration, {
  connection: workerConnection,
})

worker.on('completed', (job) => {
  console.info(`worker completed job generation for ${job.id}`)
})

worker.on('failed', (job, error) => {
  console.error(`[worker] failed job generation for ${job?.id}`, error)
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
