import { boardService } from '~/services/boardService'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard} from '../../helpers/createTestCard'
import { ObjectId } from 'mongodb'
import StatusCodes from 'http-status-codes'

describe('Integration: boardService.getDetails', () => {
    let testUser
    let boardId
    let columnId
    let cardId

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()

        // Tạo 1 Board
        const board = await createTestBoard({
            title: 'Board Test getDetails',
            ownerIds: [testUser._id]
        })
        boardId = board._id

        // Tạo 1 Column (boardId phải là ObjectId)
        const column = await createTestColumn({
            boardId: new ObjectId(boardId),
            title: 'Column Todo Test'
        })
        columnId = column._id

        // Cập nhật columnOrderIds vào Board
        await GET_DB().collection('boards').updateOne(
            { _id: boardId },
            { $push: { columnOrderIds: columnId } }
        )

        // Tạo 1 Card thuộc Column trên (Lưu ý: columnId và boardId bắt buộc phải là ObjectId để .equals() hoạt động)
        const card = await createTestCard({
            boardId: new ObjectId(boardId),
            columnId: new ObjectId(columnId),
            title: 'Card Task 1 Test'
        })
        cardId = card._id
    })

    afterAll(async () => {
        // Dọn dẹp Database sau khi test xong
        if (boardId) {
            await GET_DB().collection('boards').deleteOne({ _id: boardId })
            await GET_DB().collection('columns').deleteMany({ boardId: boardId })
            await GET_DB().collection('cards').deleteMany({ boardId: boardId })
        }
        if (testUser) {
            await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        }
        await CLOSE_DB()
    })

    it('Should return full board details, nest cards into correct columns, and delete top-level cards field', async () => {
        const resBoard = await boardService.getDetails(testUser._id.toString(), boardId.toString())

        // 1. Kiểm tra thông tin Board cơ bản
        expect(resBoard).toBeDefined()
        expect(resBoard._id.toString()).toBe(boardId.toString())
        expect(resBoard.title).toBe('Board Test getDetails')

        // 2. Kiểm tra việc gom Cards vào Columns
        expect(resBoard.columns).toBeDefined()
        expect(resBoard.columns.length).toBe(1)
        expect(resBoard.columns[0]._id.toString()).toBe(columnId.toString())

        // Kiểm tra danh sách cards bên trong column
        expect(resBoard.columns[0].cards).toBeDefined()
        expect(resBoard.columns[0].cards.length).toBe(1)
        expect(resBoard.columns[0].cards[0]._id.toString()).toBe(cardId.toString())
        expect(resBoard.columns[0].cards[0].title).toBe('Card Task 1 Test')

        // 3. [QUAN TRỌNG] Kiểm tra xem `delete resBoard.cards` trong Service đã xóa trường cards ở cấp ngoài cùng chưa
        expect(resBoard.cards).toBeUndefined()
    })

    it('Should throw ApiError with 404 status when board does not exist', async () => {
        const nonExistentBoardId = new ObjectId().toString()

        await expect(
            boardService.getDetails(
                testUser._id.toString(),
                nonExistentBoardId
            )
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_FOUND,
            message: 'Board not found!'
        })
    })
})