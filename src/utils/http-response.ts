type ApiStatus = 'success' | 'error'

type ApiResponse<T> = {
  status: ApiStatus
  data: T | null
  error: string | null
  errorData?: T | null
}

type ErrorResponseInput<T> = {
  error: string
  errorData: T | null
}

export const successResponse = <T>(data: T): ApiResponse<T> => ({
  status: 'success',
  data,
  error: null,
  errorData: null,
})

export const errorResponse = <T>({ error, errorData }: ErrorResponseInput<T>): ApiResponse<T> => ({
  status: 'error',
  data: null,
  error,
  errorData,
})
