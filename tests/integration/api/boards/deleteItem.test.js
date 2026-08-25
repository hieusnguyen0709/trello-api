import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { createTestLabel } from '../../helpers/createTestLabel'
import { createTestInvitation } from '../../helpers/createTestInvitation'
import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { BOARD_INVITATION_STATUS } from '~/utils/constants'

const request = supertest(app)

describe('API Integration: DELETE /v1/boards/:id', () => {
    let testUser
    let accessToken

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    afterAll(async () => {
        if (testUser) {
            await GET_DB().collection('boards').deleteMany({ ownerIds: testUser._id })
            await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        }
        await CLOSE_DB()
    })

    it('Should return 200 OK and delete the board with all related data', async () => {
        const board = await createTestBoard({
            title: 'Board Test API deleteItem',
            ownerIds: [testUser._id]
        })

        const column = await createTestColumn({
            boardId: new ObjectId(board._id),
            title: 'Column Todo Test'
        })

        const card = await createTestCard({
            boardId: new ObjectId(board._id),
            columnId: new ObjectId(column._id),
            title: 'Card Task 1 Test'
        })

        const label = await createTestLabel({
            boardId: new ObjectId(board._id),
            title: 'Label Test'
        })

        const invitee = await createTestUser()

        const invitation = await createTestInvitation({
            inviterId: testUser._id,
            inviteeId: invitee._id,
            boardInvitation: {
                boardId: new ObjectId(board._id),
                status: BOARD_INVITATION_STATUS.PENDING
            }
        })

        const res = await request
            .delete(`/v1/boards/${board._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        // 1. Kiểm tra Status Code
        expect(res.status).toBe(StatusCodes.OK)

        // 2. Kiểm tra Body trả về cho Client
        expect(res.body).toEqual({
            deleteResult: 'Board, its Columns, Cards, and Labels deleted successfully!'
        })

        // 3. Kiểm tra Board đã bị xóa
        const boardInDb = await GET_DB().collection('boards').findOne({ _id: board._id })
        expect(boardInDb).toBeNull()

        // 4. Kiểm tra Column đã bị xóa
        const columnInDb = await GET_DB().collection('columns').findOne({ _id: column._id })
        expect(columnInDb).toBeNull()

        // 5. Kiểm tra Card đã bị xóa
        const cardInDb = await GET_DB().collection('cards').findOne({ _id: card._id })
        expect(cardInDb).toBeNull()

        // 6. Kiểm tra Label đã bị xóa
        const labelInDb = await GET_DB().collection('labels').findOne({ _id: label._id })
        expect(labelInDb).toBeNull()

        // 7. Kiểm tra Invitation đã bị xóa
        const invitationInDb = await GET_DB().collection('invitations').findOne({ _id: invitation._id })
        expect(invitationInDb).toBeNull()

        await GET_DB().collection('users').deleteOne({ _id: invitee._id })
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const boardId = new ObjectId().toString()
        const res = await request.delete(`/v1/boards/${boardId}`)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Should return 422 when board id is invalid', async () => {
        const res = await request
            .delete('/v1/boards/invalid-board-id')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 403 when user does not have access to the board', async () => {
        const anotherUser = await createTestUser()

        const board = await createTestBoard({
            title: 'Board Test No Access',
            ownerIds: [anotherUser._id],
            memberIds: []
        })

        const res = await request
            .delete(`/v1/boards/${board._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.FORBIDDEN)
        expect(res.body.message).toBe('You do not have permission to access this board!')

        const boardInDb = await GET_DB().collection('boards').findOne({ _id: board._id })
        expect(boardInDb).not.toBeNull()

        await GET_DB().collection('boards').deleteOne({ _id: board._id })
        await GET_DB().collection('users').deleteOne({ _id: anotherUser._id })
    })

    it('Should return 403 when user is a board member but not the owner', async () => {
        const anotherUser = await createTestUser()

        const board = await createTestBoard({
            title: 'Board Test Member Delete',
            ownerIds: [anotherUser._id],
            memberIds: [testUser._id]
        })

        const res = await request
            .delete(`/v1/boards/${board._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.FORBIDDEN)
        expect(res.body.message).toBe('Only the board owner can delete this board!')

        const boardInDb = await GET_DB().collection('boards').findOne({ _id: board._id })
        expect(boardInDb).not.toBeNull()

        await GET_DB().collection('boards').deleteOne({ _id: board._id })
        await GET_DB().collection('users').deleteOne({ _id: anotherUser._id })
    })

    it('Should return 404 when board does not exist', async () => {
        const nonExistentBoardId = new ObjectId().toString()

        const res = await request
            .delete(`/v1/boards/${nonExistentBoardId}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
        expect(res.body.message).toBe('Board not found!')
    })
})