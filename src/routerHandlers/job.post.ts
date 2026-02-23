import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { errorResponse, successResponse } from '../utils/http-response.js'

const createJobSchema = z.object({
  customerName: z.string().trim().min(1),
  jobAddress: z.string().trim().min(1),
  jobType: z.string().trim().min(1),
  description: z.string().trim().min(1),
  createdByUserId: z.string().trim().min(1).optional(),
})

type CreateJobInput = z.infer<typeof createJobSchema>
type CreateJobBody = z.input<typeof createJobSchema>
type CreateJobRequest = FastifyRequest<{ Body: CreateJobBody }>

export const postJob = async (request: CreateJobRequest, reply: FastifyReply) => {
  const parsedBody = createJobSchema.safeParse(request.body)

  if (!parsedBody.success) {
    return reply.code(400).send(errorResponse('VALIDATION_ERROR'))
  }

  try {
    const body: CreateJobInput = parsedBody.data

    const job = await prisma.job.create({
      data: {
        customerName: body.customerName,
        jobAddress: body.jobAddress,
        jobType: body.jobType,
        description: body.description,
        createdByUserId: body.createdByUserId ?? null,
      },
    })

    return reply.code(201).send(successResponse(job))
  } catch (error) {
    request.log.error(error)

    return reply.code(500).send(errorResponse('INTERNAL_SERVER_ERROR'))
  }
}
