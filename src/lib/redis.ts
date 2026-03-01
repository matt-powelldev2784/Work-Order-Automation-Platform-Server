import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import type { JobsOptions } from 'bullmq'

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error('Missing Redis connection settings. Set REDIS_URL.')
}

export const jobRetryOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
}

export const jobSheetQueue = 'job-sheet-generation'

export type JobQueuePayload = {
  jobId: number
}

const connection = new Redis(redisUrl)

export const jobQueue = new Queue<JobQueuePayload>(jobSheetQueue, {
  connection: connection,
})
