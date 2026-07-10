import { ZodError } from 'zod'

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  })
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: error.flatten(),
      },
    })
    return
  }

  const status = error.statusCode || error.status || 500
  res.status(status).json({
    error: {
      message: status === 500 ? 'Internal server error' : error.message,
    },
  })
}
