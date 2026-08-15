import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'

const request = supertest(app)

describe('API Integration: POST /v1/boards', () => {
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

    it('Should create a new board and return 201 Created with valid cookie', async () => {
        const validPayload = {
            title: 'Board test',
            description: 'Board description',
            type: 'public'
        }

        const res = await request
            .post('/v1/boards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(validPayload)

        // 1. Kiểm tra Status Code
        expect(res.status).toBe(StatusCodes.CREATED) // 201

        // 2. Kiểm tra Body trả về cho Client
        expect(res.body).toHaveProperty('_id')
        expect(res.body.title).toBe(validPayload.title)
        expect(res.body.description).toBe(validPayload.description)

        // 3. Kiểm tra dữ liệu thực tế trong Database
        const boardInDb = await GET_DB().collection('boards').findOne({ _id: new ObjectId(res.body._id) })
        expect(boardInDb).not.toBeNull()
        expect(boardInDb.ownerIds[0].toString()).toBe(testUser._id.toString())
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .post('/v1/boards')
            .send({
                title: 'Board No Cookie',
                description: 'Board description',
                type: 'public'
            })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED) // 401
    })

    it('Should return 422 Unprocessable Entity when title is missing', async () => {
        const invalidPayload = {
            description: 'Missing title',
            type: 'public'
        }

        const res = await request
            .post('/v1/boards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 422 when title length is less than 3 characters', async () => {
        const invalidPayload = {
            title: 'AB',
            description: 'Board description',
            type: 'public'
        }

        const res = await request
            .post('/v1/boards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 422 when type is not public or private', async () => {
        const invalidPayload = {
            title: 'Valid Board Title',
            description: 'Board description',
            type: 'invalid_type_enum'
        }

        const res = await request
            .post('/v1/boards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })
})