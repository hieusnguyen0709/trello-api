import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { cardService } from '~/services/cardService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'

describe('Integration: cardService.getArchivedCards', () => {
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

    it('Return only archived cards for the given columnId', async () => {
        const activeCard = await createTestCard({
            boardId: testBoard._id,
            columnId: testColumn._id,
            title: 'Still Active Card'
        })

        await cardService.archive(testCard._id.toString())

        const result = await cardService.getArchivedCards(testColumn._id.toString())

        expect(result).toHaveLength(1)
        expect(result[0]._id.toString()).toBe(testCard._id.toString())
        expect(result.map(c => c._id.toString())).not.toContain(activeCard._id.toString())
    })

    it('Do not return archived cards belonging to a different column', async () => {
        const otherColumn = await createTestColumn({ boardId: testBoard._id })
        const otherCard = await createTestCard({
            boardId: testBoard._id,
            columnId: otherColumn._id,
            title: 'Archived In Other Column'
        })

        await cardService.archive(testCard._id.toString())
        await cardService.archive(otherCard._id.toString())

        const result = await cardService.getArchivedCards(testColumn._id.toString())

        expect(result).toHaveLength(1)
        expect(result[0]._id.toString()).toBe(testCard._id.toString())
    })

    it('Return an empty array when the column has no archived cards', async () => {
        const result = await cardService.getArchivedCards(testColumn._id.toString())

        expect(result).toEqual([])
    })

    it('Do not return soft-deleted cards (_destroy: true) even if archived', async () => {
        await cardService.archive(testCard._id.toString())
        await GET_DB().collection('cards').updateOne({ _id: testCard._id }, { $set: { _destroy: true } })

        const result = await cardService.getArchivedCards(testColumn._id.toString())

        expect(result).toEqual([])
    })
})