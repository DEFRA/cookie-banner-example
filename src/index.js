// Entry point for the service.
//
// ES modules ("type": "module" in package.json) let us use top-level await
// and modern import syntax throughout the codebase.
//
// The unhandledRejection handler ensures promise rejections are logged and
// the process exits with a non-zero code so container orchestrators (Docker,
// Kubernetes) know something went wrong.

import process from 'node:process'
import { createServer } from './server.js'

const server = await createServer()
await server.start()

console.log(`Server running on ${server.info.uri}`)

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection', err)
  process.exitCode = 1
})
