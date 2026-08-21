import { boardService } from '~/services/boardService'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'

describe('Integration: boardService.getBoards', () => {
    let testUser1
    let testUser2
    const createdBoardIds = []

    beforeAll(async () => {
        await CONNECT_DB()
        testUser1 = await createTestUser()
        testUser2 = await createTestUser()

        // Thêm dữ liệu đa dạng để test đủ mọi góc cạnh của câu query
        const createdBoards = await createTestBoard([
            {
                title: 'Alpha Board',
                type: 'public',
                ownerIds: [testUser1._id],
                memberIds: []
            },
            {
                title: 'Beta Board',
                type: 'private',
                ownerIds: [testUser2._id],
                memberIds: [testUser1._id] // testUser1 là member
            },
            {
                title: 'Charlie Board (Deleted)',
                type: 'public',
                ownerIds: [testUser1._id],
                memberIds: [],
                _destroy: true // Ghi đè _destroy: true để test bộ lọc xóa mềm
            },
            {
                title: 'Delta Board (Other User)',
                type: 'public',
                ownerIds: [testUser2._id],
                memberIds: [] // testUser1 không thuộc board này -> Không được trả về
            }
        ])

        createdBoards.forEach(board => createdBoardIds.push(board._id))
    })

    afterAll(async () => {
        if (createdBoardIds.length > 0) {
            await GET_DB().collection('boards').deleteMany({ _id: { $in: createdBoardIds } })
        }
        if (testUser1) await GET_DB().collection('users').deleteOne({ _id: testUser1._id })
        if (testUser2) await GET_DB().collection('users').deleteOne({ _id: testUser2._id })
        await CLOSE_DB()
    })

    it('Should return valid boards where user is owner or member and not destroyed', async () => {
        const result = await boardService.getBoards(testUser1._id.toString(), 1, 10, null)

        expect(result).toHaveProperty('boards')
        expect(result).toHaveProperty('totalBoards')
        expect(result.totalBoards).toBe(2) // Chỉ 2 board Alpha và Beta
        expect(result.boards).toHaveLength(2)

        // Kiểm tra đã được sort theo title A-Z
        expect(result.boards[0].title).toBe('Alpha Board')
        expect(result.boards[1].title).toBe('Beta Board')
    })

    it('Should handle pagination correctly when page and itemsPerPage are specified', async () => {
        // Trang 1, mỗi trang 1 bản ghi
        const page1Result = await boardService.getBoards(testUser1._id.toString(), 1, 1, null)
        expect(page1Result.boards).toHaveLength(1)
        expect(page1Result.boards[0].title).toBe('Alpha Board')
        expect(page1Result.totalBoards).toBe(2) // Tổng vẫn là 2

        // Trang 2, mỗi trang 1 bản ghi
        const page2Result = await boardService.getBoards(testUser1._id.toString(), 2, 1, null)
        expect(page2Result.boards).toHaveLength(1)
        expect(page2Result.boards[0].title).toBe('Beta Board')
    })

    it('Should filter boards by search query filter ignoring case', async () => {
        const queryFilters = { title: 'alpha' } // Chữ thường 'alpha' trong khi DB là 'Alpha Board'

        const result = await boardService.getBoards(testUser1._id.toString(), 1, 10, queryFilters)

        expect(result.totalBoards).toBe(1)
        expect(result.boards[0].title).toBe('Alpha Board')
    })
})