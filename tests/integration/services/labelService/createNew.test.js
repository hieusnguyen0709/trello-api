import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { labelService } from '~/services/labelService'
import { createTestBoard } from '../../helpers/createTestBoard'

describe('labelService.createNew - Integration Test', () => {
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({})
    })

    afterEach(async () => {
        await GET_DB().collection('labels').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Create a new label and persists it in the DB', async () => {
        const result = await labelService.createNew({
            boardId: testBoard._id.toString(),
            title: 'Bug',
            color: '#FF0000'
        })

        expect(result.title).toBe('Bug')
        expect(result.color).toBe('#FF0000')
        expect(result.boardId.toString()).toBe(testBoard._id.toString())

        const labelInDb = await GET_DB().collection('labels').findOne({ _id: result._id })
        expect(labelInDb).not.toBeNull()
        expect(labelInDb.title).toBe('Bug')
    })

    it('Throw 409 Conflict when a label with the same title and color already exists on the same board', async () => {
        await labelService.createNew({
            boardId: testBoard._id.toString(),
            title: 'Bug',
            color: '#FF0000'
        })

        await expect(
            labelService.createNew({
                boardId: testBoard._id.toString(),
                title: 'Bug',
                color: '#FF0000'
            })
        ).rejects.toThrow('Label with this title and color already exists')

        const labelsInDb = await GET_DB().collection('labels').find({ boardId: testBoard._id }).toArray()
        expect(labelsInDb).toHaveLength(1) // không tạo thêm bản ghi thứ 2
    })

    it('Allow creating a label with the same title but a different color', async () => {
        await labelService.createNew({ boardId: testBoard._id.toString(), title: 'Bug', color: '#FF0000' })

        const result = await labelService.createNew({
            boardId: testBoard._id.toString(),
            title: 'Bug',
            color: '#00FF00'
        })

        expect(result.color).toBe('#00FF00')

        const labelsInDb = await GET_DB().collection('labels').find({ boardId: testBoard._id }).toArray()
        expect(labelsInDb).toHaveLength(2)
    })

    it('Allow creating a label with the same title/color on a DIFFERENT board', async () => {
        const otherBoard = await createTestBoard({})

        await labelService.createNew({ boardId: testBoard._id.toString(), title: 'Bug', color: '#FF0000' })
        const result = await labelService.createNew({ boardId: otherBoard._id.toString(), title: 'Bug', color: '#FF0000' })

        expect(result.title).toBe('Bug')

        await GET_DB().collection('labels').deleteMany({ boardId: otherBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: otherBoard._id })
    })

    it('Allow re-creating a label with the same title/color after the old one was soft-deleted', async () => {
        const firstLabel = await labelService.createNew({
            boardId: testBoard._id.toString(),
            title: 'Bug',
            color: '#FF0000'
        })

        // Giả lập soft-delete label cũ
        await GET_DB().collection('labels').updateOne({ _id: firstLabel._id }, { $set: { _destroy: true } })

        // Tạo lại label trùng title+color -> phải cho phép, vì label cũ đã "bị xoá"
        const result = await labelService.createNew({
            boardId: testBoard._id.toString(),
            title: 'Bug',
            color: '#FF0000'
        })

        expect(result.title).toBe('Bug')
        expect(result._id.toString()).not.toBe(firstLabel._id.toString())
    })
})