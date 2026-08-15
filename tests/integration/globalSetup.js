const { MongoMemoryServer } = require('mongodb-memory-server')

module.exports = async () => {
    const instance = await MongoMemoryServer.create()
    global.__MONGOINSTANCE = instance
    process.env.MONGODB_URI = instance.getUri()
    process.env.DATABASE_NAME = 'trello_integration_test'
}