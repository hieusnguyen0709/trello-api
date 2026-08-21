import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'

const request = supertest(app)

describe('API Integration: PUT /v1/columns/:id', () => {
    let testUser
    let accessToken
    let testBoard
    let testColumn

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        // Seed 1 Board và 1 Column sạch trước mỗi test case
        testBoard = await createTestBoard({
            title: 'Board For Column Update Test',
            ownerIds: [testUser._id]
        })

        testColumn = await createTestColumn({
            boardId: testBoard._id,
            title: 'Column Original Title'
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

    it('Should update column title successfully and return 200 OK', async () => {
        const updatePayload = {
            title: 'Column Updated Title'
        }

        const res = await request
            .put(`/v1/columns/${testColumn._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(updatePayload)

        // 1. Kiểm tra Status Code
        expect(res.status).toBe(StatusCodes.OK) // 200

        // 2. Kiểm tra Body trả về cho Client
        expect(res.body.title).toBe(updatePayload.title)
        expect(res.body._id).toBe(testColumn._id.toString())

        // 3. Kiểm tra dữ liệu thực tế trong Database đã được cập nhật
        const updatedColumnInDb = await GET_DB().collection('columns').findOne({ _id: testColumn._id })
        expect(updatedColumnInDb.title).toBe(updatePayload.title)
        expect(updatedColumnInDb.updatedAt).not.toBeNull()
    })

    it('Should update cardOrderIds successfully and convert them to ObjectIds in DB', async () => {
        const mockCardId1 = new ObjectId().toString()
        const mockCardId2 = new ObjectId().toString()

        const updatePayload = {
            cardOrderIds: [mockCardId1, mockCardId2]
        }

        const res = await request
            .put(`/v1/columns/${testColumn._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(updatePayload)

        // 1. Kiểm tra Status Code
        expect(res.status).toBe(StatusCodes.OK) // 200

        // 2. Kiểm tra dữ liệu thực tế trong Database (cardOrderIds phải được convert sang ObjectId)
        const updatedColumnInDb = await GET_DB().collection('columns').findOne({ _id: testColumn._id })
        expect(updatedColumnInDb.cardOrderIds).toHaveLength(2)
        expect(updatedColumnInDb.cardOrderIds[0]).toBeInstanceOf(ObjectId)
        expect(updatedColumnInDb.cardOrderIds[0].toString()).toBe(mockCardId1)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .put(`/v1/columns/${testColumn._id}`)
            .send({
                title: 'Update Without Cookie'
            })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED) // 401
    })

    it('Should return 422 Unprocessable Entity when title length is less than 3 characters', async () => {
        const invalidPayload = {
            title: 'AB'
        }

        const res = await request
            .put(`/v1/columns/${testColumn._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 422 when cardOrderIds contains invalid ObjectId format', async () => {
        const invalidPayload = {
            cardOrderIds: ['invalid-card-object-id']
        }

        const res = await request
            .put(`/v1/columns/${testColumn._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })
})