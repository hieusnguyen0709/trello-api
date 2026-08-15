import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { StatusCodes } from 'http-status-codes'

const request = supertest(app)

describe('API Integration: PUT /v1/boards/:id', () => {
    let testUser
    let accessToken
    let boardId

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)

        const boardResult = await GET_DB().collection('boards').insertOne({
            title: 'Board Before API Update',
            description: 'Old Description',
            type: 'public',
            ownerIds: [testUser._id],
            columnOrderIds: [],
            _destroy: false
        })

        boardId = boardResult.insertedId
    })

    afterAll(async () => {
        if (boardId) {
            await GET_DB().collection('boards').deleteOne({ _id: boardId })
        }

        if (testUser) {
            await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        }

        await CLOSE_DB()
    })

    it('Should return 200 OK and update board successfully', async () => {
        const updatePayload = {
            title: 'Board Title Updated via API',
            description: 'New Description via API'
        }

        const res = await request
            .put(`/v1/boards/${boardId}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(updatePayload)

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.title).toBe(updatePayload.title)
        expect(res.body.description).toBe(updatePayload.description)

        const boardInDb = await GET_DB()
            .collection('boards')
            .findOne({ _id: boardId })

        expect(boardInDb.title).toBe(updatePayload.title)
        expect(boardInDb.description).toBe(updatePayload.description)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
        .put(`/v1/boards/${boardId}`)
        .send({ title: 'New Title' })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Should return 400 Bad Request when boardId is invalid format', async () => {
        const res = await request
            .put('/v1/boards/invalid-board-id')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ title: 'New Title' })

        expect(res.status).toBe(StatusCodes.BAD_REQUEST)
        expect(res.body.message).toBe('Invalid ObjectId format.')
    })
})