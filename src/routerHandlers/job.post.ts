import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { jobQueue, jobSheetQueue, jobRetryOptions } from '../lib/redis.js'
import { errorResponse, successResponse } from '../utils/http-response.js'
import type { Job } from '@prisma/client'

const createJobSchema = z.object({
  customerName: z.string().trim().min(1),
  jobAddress: z.string().trim().min(1),
  jobType: z.string().trim().min(1),
  description: z.string().trim().min(1),
  createdByUserId: z.uuid().optional(),
})

type CreateJobInput = z.infer<typeof createJobSchema>
type CreateJobBody = z.input<typeof createJobSchema>
type CreateJobRequest = FastifyRequest<{ Body: CreateJobBody }>

export const postJob = async (request: CreateJobRequest, reply: FastifyReply) => {
  const parsedBody = createJobSchema.safeParse(request.body)

  if (!parsedBody.success) {
    return reply
      .code(400)
      .send(errorResponse({ error: 'VALIDATION_ERROR', errorData: parsedBody.error.issues }))
  }

  // add job to database
  let job: Job
  try {
    const body: CreateJobInput = parsedBody.data

    job = await prisma.job.create({
      data: {
        customerName: body.customerName,
        jobAddress: body.jobAddress,
        jobType: body.jobType,
        description: body.description,
        //TODO - add created by user id once auth is wired in
      },
    })
  } catch (error) {
    request.log.error(error)

    return reply.code(500).send(errorResponse({ error: 'INTERNAL_SERVER_ERROR', errorData: null }))
  }

  // add job to job sheet processing queue
  try {
    const queuePayload = { jobId: job.id }

    await jobQueue.add(jobSheetQueue, queuePayload, jobRetryOptions)

    return reply.code(201).send(successResponse(job))
  } catch (queueError) {
    request.log.error(queueError)

    await prisma.job.update({
      where: { id: job.id },
      data: { jobSheetStatus: 'failed' },
    })

    return reply.code(500).send(errorResponse({ error: 'QUEUE_ENQUEUE_FAILED', errorData: null }))
  }
}
