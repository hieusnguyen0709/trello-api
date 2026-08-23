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

describe('API Integration: GET /v1/boards/:id', () => {
    let testUser
    let accessToken
    let testBoard
    let testColumn
    let testCard

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({
            title: 'API Test Board',
            description: 'Board created for API integration testing',
            ownerIds: [testUser._id]
        })

        testColumn = await createTestColumn({
            boardId: testBoard._id,
            title: 'Todo'
        })

        // Cập nhật columnOrderIds của Board, giữ đúng dữ liệu thực tế trước khi query getDetails
        await GET_DB().collection('boards').updateOne(
            { _id: testBoard._id },
            { $push: { columnOrderIds: testColumn._id } }
        )

        testCard = await createTestCard({
            boardId: testBoard._id,
            columnId: testColumn._id,
            title: 'API Test Card'
        })
    })

    afterEach(async () => {
        await GET_DB().collection('cards').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        await CLOSE_DB()
    })

    it('Should return 200 and board details with valid access token', async () => {
        const res = await request
            .get(`/v1/boards/${testBoard._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        // Board
        expect(res.body).toHaveProperty('_id')
        expect(res.body._id).toBe(testBoard._id.toString())
        expect(res.body.title).toBe('API Test Board')
        expect(res.body.description).toBe('Board created for API integration testing')

        // Columns
        expect(res.body.columns).toBeDefined()
        expect(res.body.columns).toHaveLength(1)
        expect(res.body.columns[0]._id).toBe(testColumn._id.toString())
        expect(res.body.columns[0].title).toBe('Todo')

        // Cards phải nằm bên trong Column
        expect(res.body.columns[0].cards).toBeDefined()
        expect(res.body.columns[0].cards).toHaveLength(1)
        expect(res.body.columns[0].cards[0]._id).toBe(testCard._id.toString())
        expect(res.body.columns[0].cards[0].title).toBe('API Test Card')

        // Không còn cards ở root
        expect(res.body.cards).toBeUndefined()
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request.get(`/v1/boards/${testBoard._id}`)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Should return 404 when board does not exist', async () => {
        const nonExistentBoardId = new ObjectId()

        const res = await request
            .get(`/v1/boards/${nonExistentBoardId}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('Should return 400 when board id is invalid', async () => {
        const res = await request
            .get('/v1/boards/invalid-board-id')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('Return 404 (not 403) when a non-member tries to view board details, since the query itself filters by ownership', async () => {
        const strangerUser = await createTestUser()
        const strangerToken = await createTestToken(strangerUser)

        const res = await request
            .get(`/v1/boards/${testBoard._id}`)
            .set('Cookie', [`accessToken=${strangerToken}`])

        // Lưu ý: 404, KHÔNG PHẢI 403 - vì getDetails dùng data-layer scoping
        // (query tự lọc theo ownerIds/memberIds)
        // không dùng hasBoardAccess middleware như các route write khác (update, delete, moveCard...)
        expect(res.status).toBe(StatusCodes.NOT_FOUND)

        await GET_DB().collection('users').deleteOne({ _id: strangerUser._id })
    })
})