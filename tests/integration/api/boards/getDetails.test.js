import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'

const request = supertest(app)

describe('API Integration: GET /v1/boards/:id', () => {
    let testUser
    let accessToken
    let boardId
    let columnId
    let cardId

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)

        const boardResult = await GET_DB()
            .collection('boards')
            .insertOne({
                title: 'API Test Board',
                slug: 'api-test-board',
                description: 'Board created for API integration testing',
                type: 'public',
                ownerIds: [testUser._id],
                memberIds: [],
                columnOrderIds: [],
                labelIds: [],
                createdAt: Date.now(),
                updatedAt: null,
                _destroy: false
            })

        boardId = boardResult.insertedId

        const columnResult = await GET_DB()
            .collection('columns')
            .insertOne({
                boardId,
                title: 'Todo',
                cardOrderIds: [],
                _destroy: false
            })

        columnId = columnResult.insertedId

        // Cập nhật columnOrderIds của Board
        await GET_DB()
            .collection('boards')
            .updateOne(
                { _id: boardId },
                {
                    $push: {
                        columnOrderIds: columnId
                    }
                }
            )

        const cardResult = await GET_DB()
            .collection('cards')
            .insertOne({
                boardId,
                columnId,
                title: 'API Test Card',
                _destroy: false
            })

        cardId = cardResult.insertedId
    })

    afterAll(async () => {
        if (boardId) {
            await GET_DB()
                .collection('cards')
                .deleteMany({ boardId })

            await GET_DB()
                .collection('columns')
                .deleteMany({ boardId })

            await GET_DB()
                .collection('boards')
                .deleteOne({ _id: boardId })
        }

        if (testUser) {
            await GET_DB()
                .collection('users')
                .deleteOne({ _id: testUser._id })
        }

        await CLOSE_DB()
    })

    it('Should return 200 and board details with valid access token', async () => {
        const res = await request
            .get(`/v1/boards/${boardId}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        // Board
        expect(res.body).toHaveProperty('_id')
        expect(res.body._id).toBe(boardId.toString())
        expect(res.body.title).toBe('API Test Board')
        expect(res.body.description)
            .toBe('Board created for API integration testing')

        // Columns
        expect(res.body.columns).toBeDefined()
        expect(res.body.columns).toHaveLength(1)

        expect(res.body.columns[0]._id)
            .toBe(columnId.toString())

        expect(res.body.columns[0].title)
            .toBe('Todo')

        // Cards phải nằm bên trong Column
        expect(res.body.columns[0].cards).toBeDefined()
        expect(res.body.columns[0].cards).toHaveLength(1)

        expect(res.body.columns[0].cards[0]._id)
            .toBe(cardId.toString())

        expect(res.body.columns[0].cards[0].title)
            .toBe('API Test Card')

        // Không còn cards ở root
        expect(res.body.cards).toBeUndefined()
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .get(`/v1/boards/${boardId}`)

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
})