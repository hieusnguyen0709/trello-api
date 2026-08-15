import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'

const request = supertest(app)

describe('API Integration: PUT /v1/boards/supports/moving_card', () => {
    let testUser
    let accessToken
    let validPayload

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)

        validPayload = {
            currentCardId: new ObjectId().toString(),
            prevColumnId: new ObjectId().toString(),
            prevCardOrderIds: [],
            nextColumnId: new ObjectId().toString(),
            nextCardOrderIds: [new ObjectId().toString()]
        }
    })

    afterAll(async () => {
        if (testUser) await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        await CLOSE_DB()
    })

    it('Should return 200 OK when payload is valid', async () => {
        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(validPayload)

        expect(res.status).toBe(StatusCodes.OK) // 200
        expect(res.body).toEqual({ updateResult: 'Successfully!' })
    })

    it('Should return 422 Unprocessable Entity when required fields are missing', async () => {
        const invalidPayload = {
            currentCardId: new ObjectId().toString()
            // Thiếu prevColumnId, nextColumnId...
        }

        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 422 Unprocessable Entity when array contains invalid ObjectId format', async () => {
        const invalidPayload = {
            ...validPayload,
            prevCardOrderIds: ['invalid-object-id']
        }

        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .put('/v1/boards/supports/moving_card')
            .send(validPayload)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED) // 401
    })
})