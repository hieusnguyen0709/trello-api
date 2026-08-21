import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'

const request = supertest(app)

describe('API Integration: DELETE /v1/columns/:id', () => {
    let testUser
    let accessToken
    let testBoard
    let testColumn
    let testCards

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        // 1. Seed Board
        testBoard = await createTestBoard({
            title: 'Board For Column Delete Test',
            ownerIds: [testUser._id]
        })

        // 2. Seed Column
        testColumn = await createTestColumn({
            boardId: testBoard._id,
            title: 'Column To Delete'
        })

        // 3. Cập nhật columnOrderIds vào Board
        await GET_DB().collection('boards').updateOne(
            { _id: testBoard._id },
            { $push: { columnOrderIds: testColumn._id } }
        )

        // 4. Seed các Cards thuộc Column này
        testCards = await createTestCard([
            { boardId: testBoard._id, columnId: testColumn._id, title: 'Card 1' },
            { boardId: testBoard._id, columnId: testColumn._id, title: 'Card 2' }
        ])
    })

    afterAll(async () => {
        if (testUser) {
            await GET_DB().collection('cards').deleteMany({})
            await GET_DB().collection('columns').deleteMany({})
            await GET_DB().collection('boards').deleteMany({ ownerIds: testUser._id })
            await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        }
        await CLOSE_DB()
    })

    it('Should delete column and its cards successfully, update board columnOrderIds, and return 200 OK', async () => {
        const res = await request
            .delete(`/v1/columns/${testColumn._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        // 1. Kiểm tra Status Code
        expect(res.status).toBe(StatusCodes.OK) // 200

        // 2. Kiểm tra Body trả về cho Client
        expect(res.body).toEqual({ deleteResult: 'Column and its Cards deleted successfully!' })

        // 3. Kiểm tra Column đã bị xóa khỏi DB
        const deletedColumnInDb = await GET_DB().collection('columns').findOne({ _id: testColumn._id })
        expect(deletedColumnInDb).toBeNull()

        // 4. Kiểm tra toàn bộ Cards thuộc Column này đã bị xóa khỏi DB
        const remainingCardsInDb = await GET_DB().collection('cards').find({ columnId: testColumn._id }).toArray()
        expect(remainingCardsInDb).toHaveLength(0)

        // 5. Kiểm tra columnId đã bị xóa khỏi columnOrderIds của Board
        const updatedBoardInDb = await GET_DB().collection('boards').findOne({ _id: testBoard._id })
        expect(updatedBoardInDb.columnOrderIds.map(id => id.toString())).not.toContain(testColumn._id.toString())
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .delete(`/v1/columns/${testColumn._id}`)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED) // 401
    })

    it('Should return 422 Unprocessable Entity when column id is invalid ObjectId format', async () => {
        const res = await request
            .delete('/v1/columns/invalid-column-object-id')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY) // 422
    })

    it('Should return 404 Not Found when column does not exist', async () => {
        const nonExistingColumnId = new ObjectId().toString()

        const res = await request
            .delete(`/v1/columns/${nonExistingColumnId}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.NOT_FOUND) // 404
    })
})