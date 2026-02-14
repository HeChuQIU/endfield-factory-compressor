import express from 'express'
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { SolverSession } from './solver-session'
import type { WorkerRequest, WorkerResponse } from '../../shared/solver/messages'

const port = Number(process.env.PORT ?? 3001)

const app = express()
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  const send = (message: WorkerResponse) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  const session = new SolverSession(send)

  ws.on('message', async (data) => {
    try {
      const text =
        typeof data === 'string'
          ? data
          : Buffer.isBuffer(data)
            ? data.toString('utf8')
            : Array.isArray(data)
              ? Buffer.concat(data).toString('utf8')
              : data instanceof ArrayBuffer
                ? Buffer.from(data).toString('utf8')
                : ''
      const message = JSON.parse(text) as WorkerRequest
      if (!message || typeof message.type !== 'string') {
        send({ type: 'ERROR', payload: { message: 'Invalid message format.' } })
        return
      }
      await session.handleMessage(message)
    } catch (error) {
      send({
        type: 'ERROR',
        payload: { message: error instanceof Error ? error.message : String(error) },
      })
    }
  })
})

server.listen(port, () => {
  console.log(`Solver server listening on :${port}`)
})
