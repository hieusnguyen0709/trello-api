import { CONNECT_DB, GET_DB, CLOSE_DB } from '~/config/mongodb'

describe('MongoDB connection (integration)', () => {
    beforeAll(async () => {
        await CONNECT_DB()
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Connect successfully and return a valid database instance', () => {
        const db = GET_DB()

        expect(db).toBeDefined()
        expect(db.databaseName).toBe('trello_integration_test')
    })

    it('Allow inserting and reading a document from a real collection', async () => {
            const db = GET_DB()
            const collection = db.collection('test_collection')

            await collection.insertOne({ name: 'test' })

            const result = await collection.findOne({ name: 'test' })

            expect(result).not.toBeNull()
            expect(result.name).toBe('test')

            // Dọn dẹp data vừa test
            await collection.deleteOne({ name: 'test' })
    })
})