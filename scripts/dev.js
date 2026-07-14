import { spawn } from 'node:child_process'

const processes = [
  spawn(process.execPath, ['server/src/index.js'], {
    stdio: 'inherit',
    env: process.env,
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
    stdio: 'inherit',
    env: process.env,
  }),
]

let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of processes) {
    if (!child.killed) child.kill('SIGTERM')
  }

  process.exitCode = exitCode
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error(error.message)
    shutdown(1)
  })

  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code}`
      console.error(`A development service stopped with ${reason}.`)
      shutdown(code || 1)
    }
  })
}

process.on('SIGINT', () => shutdown())
process.on('SIGTERM', () => shutdown())
