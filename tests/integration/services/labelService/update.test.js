import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { labelService } from '~/services/labelService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestLabel } from '../../helpers/createTestLabel'
// import { ObjectId } from 'mongodb'

describe('labelService.update - Integration Test', () => {
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

    it('Update the title only, keeping color unchanged', async () => {
        const result = await labelService.update(testLabel._id.toString(), { title: 'Critical Bug' })

        expect(result.title).toBe('Critical Bug')
        expect(result.color).toBe('#FF0000') // giữ nguyên, không đổi

        const labelInDb = await GET_DB().collection('labels').findOne({ _id: testLabel._id })
        expect(labelInDb.title).toBe('Critical Bug')
    })

    it('Update the color only, keeping title unchanged', async () => {
        const result = await labelService.update(testLabel._id.toString(), { color: '#00FF00' })

        expect(result.color).toBe('#00FF00')
        expect(result.title).toBe('Bug')
    })

    it('Update the updatedAt timestamp', async () => {
        const result = await labelService.update(testLabel._id.toString(), { title: 'New Title' })

        expect(result.updatedAt).not.toBeNull()
        expect(typeof result.updatedAt).toBe('number')
    })

    it('Throw 400 Bad Request when both title and color are missing', async () => {
        await expect(
            labelService.update(testLabel._id.toString(), {})
        ).rejects.toThrow('Nothing to update')

        const labelInDb = await GET_DB().collection('labels').findOne({ _id: testLabel._id })
        expect(labelInDb.title).toBe('Bug') // xác nhận không hề bị đổi
    })
})