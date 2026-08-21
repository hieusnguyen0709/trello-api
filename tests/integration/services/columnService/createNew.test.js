import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { columnService } from '~/services/columnService'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'

describe('columnService.createNew (integration)', () => {
    let testUser
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        testBoard = await createTestBoard({
            title: 'Board For Column Test',
            ownerIds: [testUser._id]
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

    it('Should create a new column successfully and update board columnOrderIds', async () => {
        const columnData = {
            boardId: testBoard._id.toString(),
            title: 'New Test Column'
        }

        const createdColumn = await columnService.createNew(columnData)

        // 1. Kiểm tra kết quả trả về từ Service
        expect(createdColumn).toBeDefined()
        expect(createdColumn).toHaveProperty('_id')
        expect(createdColumn.title).toBe(columnData.title)
        expect(createdColumn.boardId.toString()).toBe(columnData.boardId)
        expect(createdColumn.cards).toEqual([])

        // 2. Kiểm tra dữ liệu thực tế trong Database (collection columns)
        const columnInDatabase = await GET_DB()
            .collection('columns')
            .findOne({ _id: createdColumn._id })

        expect(columnInDatabase).not.toBeNull()
        expect(columnInDatabase._id).toEqual(createdColumn._id)
        expect(columnInDatabase.title).toBe(columnData.title)

        // 3. Kiểm tra Side Effect trong Database (columnOrderIds của Board được cập nhật)
        const updatedBoard = await GET_DB()
            .collection('boards')
            .findOne({ _id: testBoard._id })

        expect(updatedBoard).not.toBeNull()
        expect(updatedBoard.columnOrderIds.map(id => id.toString())).toContain(createdColumn._id.toString())
    })
})