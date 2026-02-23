type ApiStatus = 'success' | 'error'

type ApiResponse<T> = {
  status: ApiStatus
  data: T | null
  error: string | null
}

export const successResponse = <T>(data: T): ApiResponse<T> => ({
  status: 'success',
  data,
  error: null,
})

export const errorResponse = (error: string): ApiResponse<null> => ({
  status: 'error',
  data: null,
  error,
})
