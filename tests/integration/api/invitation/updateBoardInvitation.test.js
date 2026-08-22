import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestInvitation } from '../../helpers/createTestInvitation'
import { BOARD_INVITATION_STATUS } from '~/utils/constants'

const request = supertest(app)

describe('API Integration: PUT /v1/invitations/board/:invitationId', () => {
    let invitee
    let inviter
    let accessToken
    let testBoard
    let testInvitation

    beforeAll(async () => {
        await CONNECT_DB()
        invitee = await createTestUser()
        inviter = await createTestUser()
        accessToken = await createTestToken(invitee)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [inviter._id] })
        testInvitation = await createTestInvitation({
            inviterId: inviter._id,
            inviteeId: invitee._id,
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING }
        })
    })

    afterEach(async () => {
        await GET_DB().collection('invitations').deleteMany({})
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteMany({ _id: { $in: [invitee._id, inviter._id] } })
        await CLOSE_DB()
    })

    it('Should return 200 OK and update invitation status to ACCEPTED', async () => {
        const res = await request
            .put(`/v1/invitations/board/${testInvitation._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ status: BOARD_INVITATION_STATUS.ACCEPTED })

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.boardInvitation.status).toBe(BOARD_INVITATION_STATUS.ACCEPTED)

        const boardInDb = await GET_DB().collection('boards').findOne({ _id: testBoard._id })
        expect(boardInDb.memberIds.map(String)).toContain(invitee._id.toString())
    })

    it('Should return 406 when user already belongs to the board and tries to ACCEPT again', async () => {
        await GET_DB().collection('boards').updateOne(
            { _id: testBoard._id },
            { $push: { memberIds: invitee._id } }
        )

        const res = await request
            .put(`/v1/invitations/board/${testInvitation._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ status: BOARD_INVITATION_STATUS.ACCEPTED })

        expect(res.status).toBe(StatusCodes.NOT_ACCEPTABLE)
    })

    it('Should return 404 when invitationId does not exist', async () => {
        const fakeInvitationId = new (require('mongodb').ObjectId)().toString()

        const res = await request
            .put(`/v1/invitations/board/${fakeInvitationId}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ status: BOARD_INVITATION_STATUS.ACCEPTED })

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('Should return 401 when access token is missing', async () => {
        const res = await request
            .put(`/v1/invitations/board/${testInvitation._id}`)
            .send({ status: BOARD_INVITATION_STATUS.ACCEPTED })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
})