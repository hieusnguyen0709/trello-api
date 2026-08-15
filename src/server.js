/* eslint-disable no-console */
import http from 'http'
import socketIo from 'socket.io'
import exitHook from 'async-exit-hook'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { corsOptions } from '~/config/cors'
import { inviteUserToBoardSocket } from '~/sockets/inviteUserToBoardSocket'

const START_SERVER = () => {
  // Bọc Express App vào HTTP Server để dùng chung cho Socket.io
  const server = http.createServer(app)

  // Khởi tạo Socket.io với HTTP Server và CORS
  const io = socketIo(server, { cors: corsOptions })
  io.on('connection', (socket) => {
    // Gọi các socket tùy theo tính năng
    inviteUserToBoardSocket(socket)

    /// ...
  })

  if (env.BUILD_MODE === 'production') {
    // Render.com
    // Dùng server.listen thay vì app.listen vì lúc này server đã bao gồm express app và đã config socket.io
    server.listen(process.env.PORT, () => {
      console.log(`3. Production: Hello ${env.AUTHOR} - Back-end Server is running successfully at Port: ${process.env.PORT}`)
    })
  } else {
    // Local Dev
    // Dùng server.listen thay vì app.listen vì lúc me server đã bao gồm express app và đã config socket.io
    server.listen(env.APP_PORT, env.APP_HOST, () => {
      console.log(`3. Local Dev: Hello ${env.AUTHOR} - Back-end Server is running successfully at ${env.APP_HOST}:${env.APP_PORT}/`)
    })
  }

  exitHook(() => {
    console.log('4. Disconnecting from MongoDB Cloud Atlas...')
    CLOSE_DB()
    console.log('5. Disconnected from MongoDB Cloud Atlas...')
  })
}

// Immediately-invoked / Anonymous Async Functions (IIFE)
(async () => {
  try {
    console.log('1. Connecting to MongoDB Cloud Atlas...')
    await CONNECT_DB()
    console.log('2. Connected to MongoDB Cloud Atlas!')
    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()