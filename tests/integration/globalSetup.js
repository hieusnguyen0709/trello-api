const { MongoMemoryServer } = require('mongodb-memory-server')

module.exports = async () => {
    const instance = await MongoMemoryServer.create()
    global.__MONGOINSTANCE = instance
    process.env.MONGO_URL = instance.getUri()
}