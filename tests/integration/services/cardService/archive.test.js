import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { cardService } from '~/services/cardService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'

describe('Integration: cardService.archive', () => {
    let testBoard
    let testColumn
    let testCard

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({})
        testColumn = await createTestColumn({ boardId: testBoard._id })
        testCard = await createTestCard({
            boardId: testBoard._id,
            columnId: testColumn._id,
            title: 'Card To Archive'
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

    it('Set archivedAt timestamp when archiving a card', async () => {
        const result = await cardService.archive(testCard._id.toString())

        expect(result.archivedAt).not.toBeNull()
        expect(typeof result.archivedAt).toBe('number')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.archivedAt).not.toBeNull()
    })
})