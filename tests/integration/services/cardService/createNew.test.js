import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { cardService } from '~/services/cardService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'

describe('cardService.createNew - Integration Test with DB Assertion', () => {
    let testBoard
    let testColumn

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({})
        testColumn = await createTestColumn({ boardId: testBoard._id })
    })

    afterEach(async () => {
        await GET_DB().collection('cards').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Create a new card and persists it in the DB', async () => {
        const reqBody = {
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'New Card via Service'
        }

        const result = await cardService.createNew(reqBody)

        expect(result.title).toBe('New Card via Service')
        expect(result._id).toBeDefined()

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: result._id })
        expect(cardInDb).not.toBeNull()
        expect(cardInDb.title).toBe('New Card via Service')
    })

    it('Push the new card id into the parent column\'s cardOrderIds', async () => {
        const reqBody = {
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Card To Check Ordering'
        }

        const result = await cardService.createNew(reqBody)

        const columnInDb = await GET_DB().collection('columns').findOne({ _id: testColumn._id })
        expect(columnInDb.cardOrderIds.map(String)).toContain(result._id.toString())
    })

    it('Create a card with default empty checklist, labelIds, comments, attachments', async () => {
        const reqBody = {
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Card Default Fields'
        }

        const result = await cardService.createNew(reqBody)

        expect(result.checklist).toEqual([])
        expect(result.labelIds).toEqual([])
        expect(result.comments).toEqual([])
        expect(result.attachments).toEqual([])
    })
})