import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { labelService } from '~/services/labelService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestLabel } from '../../helpers/createTestLabel'
import { ObjectId } from 'mongodb'

describe('labelService.deleteOne - Integration Test', () => {
    let testBoard
    let testLabel

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({})
        testLabel = await createTestLabel({ boardId: testBoard._id, title: 'Bug', color: '#FF0000' })
    })

    afterEach(async () => {
        await GET_DB().collection('labels').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Permanently remove the label document from the DB', async () => {
        const result = await labelService.deleteOne(testLabel._id.toString())

        expect(result.deletedCount).toBe(1)

        const labelInDb = await GET_DB().collection('labels').findOne({ _id: testLabel._id })
        expect(labelInDb).toBeNull()
    })

    it('Return deletedCount 0 when labelId does not exist', async () => {
        const fakeLabelId = new ObjectId().toString()

        const result = await labelService.deleteOne(fakeLabelId)

        expect(result.deletedCount).toBe(0)
    })

    it('Do not affect other labels on the same board', async () => {
        const otherLabel = await createTestLabel({ boardId: testBoard._id, title: 'Feature', color: '#00FF00' })

        await labelService.deleteOne(testLabel._id.toString())

        const otherLabelInDb = await GET_DB().collection('labels').findOne({ _id: otherLabel._id })
        expect(otherLabelInDb).not.toBeNull()
    })
})