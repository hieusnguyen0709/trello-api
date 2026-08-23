import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'

const request = supertest(app)

describe('API Integration: POST /v1/invitations/board', () => {
    let inviter
    let invitee
    let accessToken
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
        inviter = await createTestUser()
        invitee = await createTestUser()
        accessToken = await createTestToken(inviter)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [inviter._id] })
    })

    afterEach(async () => {
        await GET_DB().collection('invitations').deleteMany({})
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteMany({ _id: { $in: [inviter._id, invitee._id] } })
        await CLOSE_DB()
    })

    it('Should return 201 Created and persist the invitation', async () => {
        const res = await request
            .post('/v1/invitations/board')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ inviteeEmail: invitee.email, boardId: testBoard._id.toString() })

        expect(res.status).toBe(StatusCodes.CREATED)
        expect(res.body.inviteeId).toBe(invitee._id.toString())

        const invitationInDb = await GET_DB().collection('invitations').findOne({})
        expect(invitationInDb).not.toBeNull()
    })

    it('Should return 422 when inviteeEmail is missing', async () => {
        const res = await request
            .post('/v1/invitations/board')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ boardId: testBoard._id.toString() })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 422 when boardId is missing', async () => {
        const res = await request
            .post('/v1/invitations/board')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ inviteeEmail: invitee.email })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 404 when invitee does not exist', async () => {
        const res = await request
            .post('/v1/invitations/board')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ inviteeEmail: 'ghost@test.com', boardId: testBoard._id.toString() })

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('Should return 401 when access token is missing', async () => {
        const res = await request
            .post('/v1/invitations/board')
            .send({ inviteeEmail: invitee.email, boardId: testBoard._id.toString() })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Return 403 when the inviter is not an owner/member of the board', async () => {
        const strangerUser = await createTestUser()
        const strangerToken = await createTestToken(strangerUser)

        const res = await request
            .post('/v1/invitations/board')
            .set('Cookie', [`accessToken=${strangerToken}`])
            .send({ inviteeEmail: invitee.email, boardId: testBoard._id.toString() })

        expect(res.status).toBe(StatusCodes.FORBIDDEN)

        const invitationsInDb = await GET_DB().collection('invitations').find({}).toArray()
        expect(invitationsInDb).toHaveLength(0)

        await GET_DB().collection('users').deleteOne({ _id: strangerUser._id })
    })
})