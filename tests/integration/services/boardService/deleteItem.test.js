import { boardService } from '~/services/boardService'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { createTestLabel } from '../../helpers/createTestLabel'
import { createTestInvitation } from '../../helpers/createTestInvitation'
import { ObjectId } from 'mongodb'
import StatusCodes from 'http-status-codes'

describe('Integration: boardService.deleteItem', () => {
    let testUser
    let testInvitee
    let boardId
    let columnId
    let cardId
    let labelId
    let invitationId

    beforeAll(async () => {
        await CONNECT_DB()

        testUser = await createTestUser()
        testInvitee = await createTestUser()

        // Tạo Board
        const board = await createTestBoard({
            title: 'Board Test deleteItem',
            ownerIds: [testUser._id]
        })
        boardId = board._id

        // Tạo Column
        const column = await createTestColumn({
            boardId: new ObjectId(boardId),
            title: 'Column Todo Test'
        })
        columnId = column._id

        // Tạo Card
        const card = await createTestCard({
            boardId: new ObjectId(boardId),
            columnId: new ObjectId(columnId),
            title: 'Card Task 1 Test'
        })
        cardId = card._id

        // Tạo Label
        const label = await createTestLabel({
            boardId: new ObjectId(boardId),
            title: 'Label Test'
        })
        labelId = label._id

        // Tạo Invitation
        const invitation = await createTestInvitation({
            inviterId: testUser._id,
            inviteeId: testInvitee._id,
            boardInvitation: {
                boardId: new ObjectId(boardId),
                status: 'PENDING'
            }
        })
        invitationId = invitation._id
    })

    afterAll(async () => {
        if (boardId) {
            await GET_DB().collection('boards').deleteOne({ _id: boardId })
            await GET_DB().collection('columns').deleteMany({ boardId: boardId })
            await GET_DB().collection('cards').deleteMany({ boardId: boardId })
            await GET_DB().collection('labels').deleteMany({ boardId: boardId })
            await GET_DB().collection('invitations').deleteMany({ 'boardInvitation.boardId': boardId })
        }

        if (testUser) await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        if (testInvitee) await GET_DB().collection('users').deleteOne({ _id: testInvitee._id })
        await CLOSE_DB()
    })

    it('Should delete the board and all related data successfully', async () => {
        const result = await boardService.deleteItem(
            testUser._id.toString(),
            boardId.toString()
        )

        // 1. Kiểm tra kết quả trả về từ service
        expect(result).toEqual({
            deleteResult:'Board, its Columns, Cards, and Labels deleted successfully!'
        })

        // 2. Board phải bị xóa
        const deletedBoard = await GET_DB().collection('boards').findOne({ _id: boardId })
        expect(deletedBoard).toBeNull()

        // 3. Column phải bị xóa
        const deletedColumn = await GET_DB().collection('columns').findOne({ _id: columnId })
        expect(deletedColumn).toBeNull()

        // 4. Card phải bị xóa
        const deletedCard = await GET_DB().collection('cards').findOne({ _id: cardId })
        expect(deletedCard).toBeNull()

        // 5. Label phải bị xóa
        const deletedLabel = await GET_DB().collection('labels').findOne({ _id: labelId })
        expect(deletedLabel).toBeNull()

        // 6. Invitation phải bị xóa
        const deletedInvitation = await GET_DB().collection('invitations').findOne({ _id: invitationId })
        expect(deletedInvitation).toBeNull()
    })

    it('Should throw ApiError with 404 status when board does not exist', async () => {
        const nonExistentBoardId = new ObjectId().toString()

        await expect(boardService.deleteItem(testUser._id.toString(), nonExistentBoardId))
            .rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND, message: 'Board not found!' })
    })

    it('Should throw ApiError with 403 status when user is not the board owner', async () => {
        const anotherUser = await createTestUser()

        const board = await createTestBoard({
            title: 'Board Test unauthorized delete',
            ownerIds: [anotherUser._id]
        })

        await expect(boardService.deleteItem(testUser._id.toString(), board._id.toString()))
            .rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN, message: 'Only the board owner can delete this board!' })

        const existingBoard = await GET_DB().collection('boards').findOne({ _id: board._id })

        expect(existingBoard).not.toBeNull()

        await GET_DB().collection('boards').deleteOne({ _id: board._id })
        await GET_DB().collection('users').deleteOne({ _id: anotherUser._id })
    })
})