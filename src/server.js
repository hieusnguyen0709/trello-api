/* eslint-disable no-console */
import express from 'express'
import cors from 'cors'
import { corsOptions } from '~/config/cors'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from './config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
import cookieParser from 'cookie-parser'

const START_SERVER = () => {
  const app = express()

  // Fix Cache from disk of ExpressJS
  app.use((req, res, next) => {
    res.set('Cache-control', 'no-store')
    next()
  })

  // Cookie Parser configuration
  app.use(cookieParser())

  // Proceed CORS
  app.use(cors(corsOptions))

  // Enable req.body
  app.use(express.json())

  // APIs V1
  app.use('/v1', APIs_V1)

  // Middleware
  app.use(errorHandlingMiddleware)

  app.get('/', async (req, res) => {
    res.end('<h1>Hello World!</h1><hr>')
  })

  if (env.BUILD_MODE === 'production') {
    // Render.com
    app.listen(process.env.PORT, () => {
      console.log(`3. Production: Hello ${env.AUTHOR} - Back-end Server is running successfully at Port: ${ process.env.PORT }`)
    })
  } else {
    // Local Dev
    app.listen(env.APP_PORT, env.APP_HOST, () => {
      console.log(`3. Local Dev: Hello ${env.AUTHOR} - Back-end Server is running successfully at ${ env.APP_HOST }:${ env.APP_PORT }/`)
    })
  }

  exitHook(() => {
    console.log('4. Disconnecting from MongoDB Cloud Atlas...')
    CLOSE_DB()
    console.log('5. Disconnected from MongoDB Cloud Atlas...')
  })
}

//Immediately-invoked / Anonymous Async Functions (IIFE)
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