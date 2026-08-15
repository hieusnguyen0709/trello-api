/* eslint-disable no-console */
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { corsOptions } from '~/config/cors'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'

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

// Root API Test
app.get('/', async (req, res) => {
  res.end('<h1>Hello World!</h1><hr>')
})

// APIs V1
app.use('/v1', APIs_V1)

// Middleware xử lý lỗi tập trung (LƯU Ý: Luôn đặt sau cùng tất cả các Routes)
app.use(errorHandlingMiddleware)

export default app