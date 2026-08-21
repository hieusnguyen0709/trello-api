import { boardService } from '~/services/boardService'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard} from '../../helpers/createTestCard'
import { ObjectId } from 'mongodb'

describe('Integration: boardService.moveCardToDifferentColumn', () => {
    let testUser
    let boardId
    let prevColumnId
    let nextColumnId
    let currentCardId
    let remainingCardId

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()

        // 1. Tạo Board
        const board = await createTestBoard({
            title: 'Board Drag & Drop Test',
            ownerIds: [testUser._id]
        })
        boardId = board._id

        // 2. Tạo Card sẽ được di chuyển
        currentCardId = new ObjectId()
        remainingCardId = new ObjectId()

        // 3 & 4. Tạo Column cũ (chứa currentCardId) và Column mới (chứa remainingCardId)
        const [prevColumn, nextColumn] = await createTestColumn([
            {
                boardId,
                title: 'Column A (Old)',
                cardOrderIds: [currentCardId]
            },
            {
                boardId,
                title: 'Column B (New)',
                cardOrderIds: [remainingCardId]
            }
        ])

        prevColumnId = prevColumn._id
        nextColumnId = nextColumn._id

        // 5. Tạo Card trong Database
        await createTestCard({
            _id: currentCardId,
            boardId,
            columnId: prevColumnId,
            title: 'Card Being Moved'
        })
    })

    afterAll(async () => {
        await GET_DB().collection('boards').deleteMany({ _id: boardId })
        await GET_DB().collection('columns').deleteMany({ boardId })
        await GET_DB().collection('cards').deleteMany({ boardId })
        if (testUser) await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        await CLOSE_DB()
    })

    it('Should update cardOrderIds in both columns and update columnId of current card', async () => {
        const payload = {
            currentCardId: currentCardId.toString(),
            prevColumnId: prevColumnId.toString(),
            prevCardOrderIds: [], // Column A sau khi rút card sẽ rỗng
            nextColumnId: nextColumnId.toString(),
            nextCardOrderIds: [remainingCardId.toString(), currentCardId.toString()] // Column B nhận card mới
        }

        const result = await boardService.moveCardToDifferentColumn(payload)

        // 1. Kiểm tra kết quả trả về từ service
        expect(result).toEqual({ updateResult: 'Successfully!' })

        // 2. Kiểm tra Column cũ trong DB (đã bị rút card)
        const prevColumnInDb = await GET_DB().collection('columns').findOne({ _id: prevColumnId })
        expect(prevColumnInDb.cardOrderIds).toHaveLength(0)

        // 3. Kiểm tra Column mới trong DB (đã được thêm card vào cuối)
        const nextColumnInDb = await GET_DB().collection('columns').findOne({ _id: nextColumnId })
        expect(nextColumnInDb.cardOrderIds).toHaveLength(2)
        expect(nextColumnInDb.cardOrderIds.map(id => id.toString())).toContain(currentCardId.toString())

        // 4. Kiểm tra Card trong DB (đã đổi columnId sang nextColumnId)
        const cardInDb = await GET_DB().collection('cards').findOne({ _id: currentCardId })
        expect(cardInDb.columnId.toString()).toBe(nextColumnId.toString())
    })
})