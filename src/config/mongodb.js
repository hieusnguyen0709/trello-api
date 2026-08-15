import { MongoClient, ServerApiVersion } from 'mongodb'
import { env } from '~/config/environment'

let trelloDatabaseInstance = null
let mongoClientInstance = null

export const CLOSE_DB = async () => {
    await mongoClientInstance.close()
}

export const CONNECT_DB = async () => {
    const mongoUri = process.env.MONGODB_URI || env.MONGODB_URI
    const dbName = process.env.DATABASE_NAME || env.DATABASE_NAME
    if (!mongoUri) {
        throw new Error('MONGODB_URI is undefined! Make sure process.env.MONGODB_URI is set by Jest globalSetup or .env file.')
    }
    mongoClientInstance = new MongoClient(mongoUri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true
        }
    })
    await mongoClientInstance.connect()
    trelloDatabaseInstance = mongoClientInstance.db(dbName)
    // console.log('Mongo URI source:', process.env.MONGODB_URI ? 'process.env' : 'env')
    // console.log(
    //     'Mongo URI prefix:',
    //     mongoUri?.substring(0, 30)
    // )
    // console.log('Database:', dbName)
}

export const GET_DB = () => {
    if (!trelloDatabaseInstance) throw new Error('Must connect to Database first!')
    return trelloDatabaseInstance
}