import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { labelService } from '~/services/labelService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestLabel } from '../../helpers/createTestLabel'

describe('labelService.getByBoardId - Integration Test', () => {
    let testBoard
    let otherBoard

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({})
        otherBoard = await createTestBoard({})
    })

    afterEach(async () => {
        await GET_DB().collection('labels').deleteMany({})
        await GET_DB().collection('boards').deleteMany({ _id: { $in: [testBoard._id, otherBoard._id] } })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Return all labels belonging to the given board', async () => {
        await createTestLabel({ boardId: testBoard._id, title: 'Bug', color: '#FF0000' })
        await createTestLabel({ boardId: testBoard._id, title: 'Feature', color: '#00FF00' })

        const result = await labelService.getByBoardId(testBoard._id.toString())

        expect(result).toHaveLength(2)
        expect(result.map(l => l.title).sort()).toEqual(['Bug', 'Feature'])
    })

    it('Do NOT return labels belonging to a different board', async () => {
        await createTestLabel({ boardId: testBoard._id, title: 'Bug', color: '#FF0000' })
        await createTestLabel({ boardId: otherBoard._id, title: 'Other Board Label', color: '#0000FF' })

        const result = await labelService.getByBoardId(testBoard._id.toString())

        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Bug')
    })

    it('Exclude soft-deleted labels (_destroy: true)', async () => {
        await createTestLabel({ boardId: testBoard._id, title: 'Active Label', color: '#FF0000' })
        await createTestLabel({ boardId: testBoard._id, title: 'Deleted Label', color: '#00FF00', _destroy: true })

        const result = await labelService.getByBoardId(testBoard._id.toString())

        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Active Label')
    })

    it('Return an empty array when board has no labels', async () => {
        const result = await labelService.getByBoardId(testBoard._id.toString())

        expect(result).toEqual([])
    })
})