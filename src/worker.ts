console.log('[worker] test worker started')

const heartbeat = setInterval(() => {
  console.log('[worker] alive')
}, 30000)

const shutdown = () => {
  console.log('[worker] shutting down')
  clearInterval(heartbeat)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
