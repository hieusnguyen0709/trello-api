import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { columnService } from '~/services/columnService'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

describe('columnService.deleteItem (integration)', () => {
    let testUser
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
    })

    beforeEach(async () => {
        // Seed Board mới trước mỗi test case
        testBoard = await createTestBoard({
            title: 'Board For Column Delete Test',
            ownerIds: [testUser._id]
        })
    })

    afterAll(async () => {
        if (testUser) {
            await GET_DB().collection('cards').deleteMany({})
            await GET_DB().collection('columns').deleteMany({})
            await GET_DB().collection('boards').deleteMany({ ownerIds: testUser._id })
            await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        }
        await CLOSE_DB()
    })

    it('Should delete column and its cards successfully, and pull columnId from board', async () => {
        // 1. Seed Column
        const testColumn = await createTestColumn({
            boardId: testBoard._id,
            title: 'Column To Delete'
        })

        // 2. Cập nhật columnOrderIds trong Board
        await GET_DB().collection('boards').updateOne(
            { _id: testBoard._id },
            { $push: { columnOrderIds: testColumn._id } }
        )

        // 3. Seed các Cards thuộc Column này
        await createTestCard([
            { boardId: testBoard._id, columnId: testColumn._id, title: 'Card 1' },
            { boardId: testBoard._id, columnId: testColumn._id, title: 'Card 2' }
        ])

        // Thực thi service
        const result = await columnService.deleteItem(testColumn._id.toString())

        // 1. Kiểm tra kết quả trả về từ Service
        expect(result).toEqual({ deleteResult: 'Column and its Cards deleted successfully!' })

        // 2. Kiểm tra Column đã bị xóa trong Database
        const columnInDatabase = await GET_DB()
            .collection('columns')
            .findOne({ _id: testColumn._id })
        expect(columnInDatabase).toBeNull()

        // 3. Kiểm tra toàn bộ Cards thuộc Column đã bị xóa trong Database
        const cardsInDatabase = await GET_DB()
            .collection('cards')
            .find({ columnId: testColumn._id })
            .toArray()
        expect(cardsInDatabase).toHaveLength(0)

        // 4. Kiểm tra columnId đã bị gỡ khỏi columnOrderIds của Board
        const updatedBoard = await GET_DB()
            .collection('boards')
            .findOne({ _id: testBoard._id })
        expect(updatedBoard.columnOrderIds.map(id => id.toString())).not.toContain(testColumn._id.toString())
    })

    it('Should throw ApiError 404 when column does not exist', async () => {
        const nonExistingColumnId = new ObjectId().toString()

        await expect(
            columnService.deleteItem(nonExistingColumnId)
        ).rejects.toThrow(ApiError)

        await expect(
            columnService.deleteItem(nonExistingColumnId)
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_FOUND,
            message: 'Column not found!'
        })
    })
})