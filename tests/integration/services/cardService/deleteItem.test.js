import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { cardService } from '~/services/cardService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'

describe('cardService.deleteItem - Integration Test with DB Assertion', () => {
    let testBoard
    let testColumn
    let testCard

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({})
        testColumn = await createTestColumn({ boardId: testBoard._id })

        testCard = await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Card To Delete'
        })
    })

    afterEach(async () => {
        await GET_DB().collection('cards').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Delete the card from the DB', async () => {
        const result = await cardService.deleteItem(testCard._id.toString())

        expect(result).toEqual({
            deleteResult: 'Card deleted successfully!'
        })

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })

        expect(cardInDb).toBeNull()
    })

    it('Remove the deleted card ID from the parent column cardOrderIds', async () => {
        const columnBeforeDelete = await GET_DB().collection('columns').findOne({ _id: testColumn._id })

        expect(columnBeforeDelete.cardOrderIds.map(String))
            .toContain(testCard._id.toString())

        await cardService.deleteItem(testCard._id.toString())

        const columnAfterDelete = await GET_DB().collection('columns').findOne({ _id: testColumn._id })

        expect(columnAfterDelete.cardOrderIds.map(String))
            .not.toContain(testCard._id.toString())
    })

    it('Throw error when the card does not exist', async () => {
        await cardService.deleteItem(testCard._id.toString())

        await expect(
            cardService.deleteItem(testCard._id.toString())
        ).rejects.toThrow('Card not found!')

        const columnInDb = await GET_DB().collection('columns').findOne({ _id: testColumn._id })

        expect(columnInDb.cardOrderIds.map(String))
            .not.toContain(testCard._id.toString())
    })
})
