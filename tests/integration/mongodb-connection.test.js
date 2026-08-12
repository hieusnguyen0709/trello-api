describe('MongoDB connection (integration)', () => {
    let CONNECT_DB
    let GET_DB
    let CLOSE_DB

    beforeAll(async () => {
        process.env.MONGODB_URI = process.env.MONGO_URL
        process.env.DATABASE_NAME = 'trello_integration_test'

        const mongodbModule = await import('~/config/mongodb')

        CONNECT_DB = mongodbModule.CONNECT_DB
        GET_DB = mongodbModule.GET_DB
        CLOSE_DB = mongodbModule.CLOSE_DB

        await CONNECT_DB()
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Connect successfully and return a valid database instance', () => {
        const db = GET_DB()

        expect(db).toBeDefined()
    })

    it('Allow inserting and reading a document from a real collection', async () => {
        const db = GET_DB()
        const collection = db.collection('test_collection')

        await collection.insertOne({ name: 'test' })

        const result = await collection.findOne({ name: 'test' })

        expect(result.name).toBe('test')
    })
})