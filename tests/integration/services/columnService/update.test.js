import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { columnService } from '~/services/columnService'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { ObjectId } from 'mongodb'

describe('columnService.update (integration)', () => {
    let testUser
    let testBoard
    let testColumn

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        testBoard = await createTestBoard({
            title: 'Board For Column Update Test',
            ownerIds: [testUser._id]
        })
        testColumn = await createTestColumn({
            boardId: testBoard._id,
            title: 'Old Column Title'
        })
    })

    afterAll(async () => {
        if (testUser) {
            await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
            await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
            await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        }
        await CLOSE_DB()
    })

    it('Should update column title and updatedAt timestamp successfully', async () => {
        const updatePayload = {
            title: 'Updated Column Title'
        }

        const updatedColumn = await columnService.update(
            testColumn._id.toString(),
            updatePayload
        )

        // 1. Kiểm tra kết quả trả về từ Service
        expect(updatedColumn).toBeDefined()
        expect(updatedColumn._id.toString()).toBe(testColumn._id.toString())
        expect(updatedColumn.title).toBe(updatePayload.title)
        expect(updatedColumn.updatedAt).not.toBeNull()

        // 2. Kiểm tra dữ liệu thực tế trong Database
        const columnInDatabase = await GET_DB()
            .collection('columns')
            .findOne({ _id: testColumn._id })

        expect(columnInDatabase).not.toBeNull()
        expect(columnInDatabase.title).toBe(updatePayload.title)
        expect(columnInDatabase.updatedAt).not.toBeNull()
    })

    it('Should update cardOrderIds and convert them to ObjectId instances in DB', async () => {
        const mockCardId1 = new ObjectId().toString()
        const mockCardId2 = new ObjectId().toString()

        const updatePayload = {
            cardOrderIds: [mockCardId1, mockCardId2]
        }

        const updatedColumn = await columnService.update(
            testColumn._id.toString(),
            updatePayload
        )

        // 1. Kiểm tra kết quả trả về từ Service
        expect(updatedColumn.cardOrderIds.map(id => id.toString())).toEqual([mockCardId1, mockCardId2])

        // 2. Kiểm tra dữ liệu thực tế trong Database (cardOrderIds phải được convert sang ObjectId)
        const columnInDatabase = await GET_DB()
            .collection('columns')
            .findOne({ _id: testColumn._id })

        expect(columnInDatabase.cardOrderIds).toHaveLength(2)
        expect(columnInDatabase.cardOrderIds[0]).toBeInstanceOf(ObjectId)
        expect(columnInDatabase.cardOrderIds[0].toString()).toBe(mockCardId1)
    })
})