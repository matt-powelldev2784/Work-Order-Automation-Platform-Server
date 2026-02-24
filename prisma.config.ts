import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// this stops typescript errors related to process.env access
// we need to do this because prisma.config.ts is not compiled by tsc, but it still needs access to environment variables at runtime
type RuntimeProcess = {
  process?: {
    env?: Record<string, string | undefined>
    argv?: string[]
  }
}
const runtimeProcess = (globalThis as RuntimeProcess).process

// allows logging of DATABASE_URL environment variable errors if it is not available
const databaseUrl = runtimeProcess?.env?.['DATABASE_URL']
const isGenerateCommand = runtimeProcess?.argv?.includes('generate') ?? false
const requiresDatabaseUrl = !isGenerateCommand
if (requiresDatabaseUrl && !databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required in prisma.config.ts')
}

// prisma config
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl ?? 'postgresql://postgres:postgres@localhost:5432/postgres',
  },
})
