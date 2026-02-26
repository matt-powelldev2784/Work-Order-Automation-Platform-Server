import 'dotenv/config'
import { Job, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'
import { prisma } from './lib/prisma.js'
import { jobSheetQueue, type JobQueuePayload } from './lib/redis.js'

const redisUrl = process.env.REDIS_URL
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET

if (!redisUrl) throw new Error('Missing Redis connection settings. Set REDIS_URL.')
if (!supabaseUrl) throw new Error('Missing SUPABASE_URL environment variable.')
if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.')
if (!supabaseStorageBucket) throw new Error('Missing SUPABASE_STORAGE_BUCKET environment variable.')
if (redisUrl) console.info('staring process job sheet generation worker...')

const workerConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
})

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const updateJobStatus = (jobId: string, jobSheetStatus: 'ready' | 'failed') =>
  prisma.job.update({
    where: { id: jobId },
    data: { jobSheetStatus },
  })

const generateAndUploadJobSheet = async (jobId: string) => {
  const jobRecord = await prisma.job.findUnique({ where: { id: jobId } })

  if (!jobRecord) {
    throw new Error(`Job not found for id ${jobId}`)
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Job Sheet')

  sheet.columns = [
    { header: 'Field', key: 'field', width: 24 },
    { header: 'Value', key: 'value', width: 60 },
  ]

  sheet.addRows([
    { field: 'Job ID', value: jobRecord.id },
    { field: 'Customer Name', value: jobRecord.customerName },
    { field: 'Job Address', value: jobRecord.jobAddress },
    { field: 'Job Type', value: jobRecord.jobType },
    { field: 'Description', value: jobRecord.description },
    { field: 'Created At', value: jobRecord.createdAt.toISOString() },
  ])

  const fileName = `${jobRecord.id}.xlsx`
  const storagePath = `${jobRecord.id}/${fileName}`
  const workbookBuffer = await workbook.xlsx.writeBuffer()

  const { error: uploadError } = await supabase.storage
    .from(supabaseStorageBucket)
    .upload(storagePath, workbookBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    })

  if (uploadError) {
    throw uploadError
  }

  return storagePath
}

const markJobReadyWithFile = async (jobId: string, filePath: string) => {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        jobSheetStatus: 'ready',
        fileUrl: filePath,
      },
    })
  } catch (error) {
    console.error(`Failed to update job ${jobId} with ready status and file path`, error)
    throw error
  }
}

const processJobSheetGeneration = async (job: Job<JobQueuePayload>) => {
  const { jobId } = job.data

  try {
    const generatedFilePath = await generateAndUploadJobSheet(jobId)
    await markJobReadyWithFile(jobId, generatedFilePath)
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
