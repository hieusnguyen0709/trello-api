import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'

const request = supertest(app)

describe('API Integration: PUT /v1/boards/supports/moving_card', () => {
    let testUser
    let accessToken
    let testBoard
    let prevColumn
    let nextColumn
    let testCard
    let validPayload

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        prevColumn = await createTestColumn({ boardId: testBoard._id })
        nextColumn = await createTestColumn({ boardId: testBoard._id })
        testCard = await createTestCard({
            boardId: testBoard._id,
            columnId: prevColumn._id,
            title: 'Card To Move'
        })

        // Seed sẵn cardOrderIds như thực tế trước khi kéo thả
        await GET_DB().collection('columns').updateOne(
            { _id: prevColumn._id },
            { $set: { cardOrderIds: [testCard._id] } }
        )

        validPayload = {
            currentCardId: testCard._id.toString(),
            prevColumnId: prevColumn._id.toString(),
            prevCardOrderIds: [],
            nextColumnId: nextColumn._id.toString(),
            nextCardOrderIds: [testCard._id.toString()]
        }
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

    it('Should return 200 OK and persist the card move in DB', async () => {
        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(validPayload)

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body).toEqual({ updateResult: 'Successfully!' })

        // Xác nhận thật sự đã đổi trong DB
        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.columnId.toString()).toBe(nextColumn._id.toString())

        const prevColumnInDb = await GET_DB().collection('columns').findOne({ _id: prevColumn._id })
        expect(prevColumnInDb.cardOrderIds).toHaveLength(0)

        const nextColumnInDb = await GET_DB().collection('columns').findOne({ _id: nextColumn._id })
        expect(nextColumnInDb.cardOrderIds.map(String)).toContain(testCard._id.toString())
    })

    it('Should return 422 Unprocessable Entity when required fields are missing', async () => {
        const invalidPayload = { currentCardId: testCard._id.toString() }

        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 422 Unprocessable Entity when array contains invalid ObjectId format', async () => {
        const invalidPayload = { ...validPayload, prevCardOrderIds: ['invalid-object-id'] }

        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .put('/v1/boards/supports/moving_card')
            .send(validPayload)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Should return 404 when currentCardId does not exist', async () => {
        const invalidPayload = { ...validPayload, currentCardId: new ObjectId().toString() }

        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(invalidPayload)

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('Return 403 when user is not an owner/member of the board', async () => {
        const strangerUser = await createTestUser()
        const strangerToken = await createTestToken(strangerUser)

        const res = await request
            .put('/v1/boards/supports/moving_card')
            .set('Cookie', [`accessToken=${strangerToken}`])
            .send(validPayload)

        expect(res.status).toBe(StatusCodes.FORBIDDEN)

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.columnId.toString()).toBe(prevColumn._id.toString())

        await GET_DB().collection('users').deleteOne({ _id: strangerUser._id })
    })
})