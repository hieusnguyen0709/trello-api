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

describe('API Integration: GET /v1/invitations', () => {
    let currentUser
    let inviter
    let accessToken
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
        currentUser = await createTestUser()
        inviter = await createTestUser()
        accessToken = await createTestToken(currentUser)
        testBoard = await createTestBoard({})
    })

    afterEach(async () => {
        await GET_DB().collection('invitations').deleteMany({})
    })

    afterAll(async () => {
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
        await GET_DB().collection('users').deleteMany({ _id: { $in: [currentUser._id, inviter._id] } })
        await CLOSE_DB()
    })

    it('Should return 200 OK with the current user\'s invitations', async () => {
        await createTestInvitation({
            inviterId: inviter._id,
            inviteeId: currentUser._id,
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING }
        })

        const res = await request
            .get('/v1/invitations')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].invitee._id).toBe(currentUser._id.toString())
    })

    it('Should return 200 OK with an empty array when there are no invitations', async () => {
        const res = await request
            .get('/v1/invitations')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body).toEqual([])
    })

    it('Should return 401 when access token is missing', async () => {
        const res = await request.get('/v1/invitations')

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
})