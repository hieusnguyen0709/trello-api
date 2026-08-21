import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'

const request = supertest(app)

describe('API Integration: POST /v1/columns', () => {
    let testUser
    let accessToken
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        // Seed 1 Board sạch trước mỗi test case để lấy boardId hợp lệ
        testBoard = await createTestBoard({
            title: 'Board For Column Test',
            ownerIds: [testUser._id]
        })
    })

    afterAll(async () => {
        if (testUser) {
            await GET_DB().collection('columns').deleteMany({})
            await GET_DB().collection('boards').deleteMany({ ownerIds: testUser._id })
            await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        }
        await CLOSE_DB()
    })

    it('Should create a new column and return 201 Created with valid cookie', async () => {
        const validPayload = {
            boardId: testBoard._id.toString(),
            title: 'To Do Column'
        }

        const res = await request
            .post('/v1/columns')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(validPayload)

        // 1. Kiểm tra Status Code
        expect(res.status).toBe(StatusCodes.CREATED) // 201

        // 2. Kiểm tra Body trả về cho Client
        expect(res.body).toHaveProperty('_id')
        expect(res.body.title).toBe(validPayload.title)
        expect(res.body.boardId).toBe(validPayload.boardId)
        expect(res.body.cards).toEqual([])

        // 3. Kiểm tra dữ liệu thực tế trong Database (collection columns)
        const columnInDb = await GET_DB().collection('columns').findOne({ _id: new ObjectId(res.body._id) })
        expect(columnInDb).not.toBeNull()
        expect(columnInDb.title).toBe(validPayload.title)

        // 4. Kiểm tra Side Effect trong Database (columnOrderIds của collection boards được cập nhật)
        const updatedBoard = await GET_DB().collection('boards').findOne({ _id: testBoard._id })
        expect(updatedBoard.columnOrderIds.map(id => id.toString())).toContain(res.body._id)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .post('/v1/columns')
            .send({
                boardId: testBoard._id.toString(),
                title: 'Column No Cookie'
            })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED) // 401
    })

    it('Should return 422 Unprocessable Entity when title is missing', async () => {
        const invalidPayload = {
            boardId: testBoard._id.toString()
        }

        const res = await request
            .post('/v1/columns')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 422 when title length is less than 3 characters', async () => {
        const invalidPayload = {
            boardId: testBoard._id.toString(),
            title: 'AB'
        }

        const res = await request
            .post('/v1/columns')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 422 when boardId is invalid ObjectId format', async () => {
        const invalidPayload = {
            boardId: 'invalid-object-id',
            title: 'Valid Column Title'
        }

        const res = await request
            .post('/v1/columns')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })
})