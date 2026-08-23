import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { ObjectId } from 'mongodb'

const request = supertest(app)

describe('API Integration: POST /v1/cards', () => {
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
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        testColumn = await createTestColumn({ boardId: testBoard._id })
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

    it('Should return 201 Created and create a new card', async () => {
        const payload = {
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'New Card via API'
        }

        const res = await request
            .post('/v1/cards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(payload)

        expect(res.status).toBe(StatusCodes.CREATED)
        expect(res.body.title).toBe('New Card via API')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: new ObjectId(res.body._id) })
        expect(cardInDb).not.toBeNull()
        expect(cardInDb.title).toBe('New Card via API')
    })

    it('Should persist the card in DB and update column cardOrderIds', async () => {
        const payload = {
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Card Persisted Check'
        }

        const res = await request
            .post('/v1/cards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(payload)

        const cardId = res.body._id

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: new (require('mongodb').ObjectId)(cardId) })
        expect(cardInDb.title).toBe('Card Persisted Check')

        const columnInDb = await GET_DB().collection('columns').findOne({ _id: testColumn._id })
        expect(columnInDb.cardOrderIds.map(String)).toContain(cardId)
    })

    it('Should return 422 when title is missing', async () => {
        const payload = {
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString()
            // thiếu title
        }

        const res = await request
            .post('/v1/cards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send(payload)

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 422 when boardId is missing', async () => {
        const res = await request
            .post('/v1/cards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ columnId: testColumn._id.toString(), title: 'Card No Board' })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 422 when title is shorter than 3 characters', async () => {
        const res = await request
            .post('/v1/cards')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({
                boardId: testBoard._id.toString(),
                columnId: testColumn._id.toString(),
                title: 'ab'
            })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .post('/v1/cards')
            .send({
                boardId: testBoard._id.toString(),
                columnId: testColumn._id.toString(),
                title: 'No Auth Card'
            })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Return 403 when user is not an owner/member of the board', async () => {
        const strangerUser = await createTestUser()
        const strangerToken = await createTestToken(strangerUser)

        const res = await request
            .post('/v1/cards')
            .set('Cookie', [`accessToken=${strangerToken}`])
            .send({
                boardId: testBoard._id.toString(),
                columnId: testColumn._id.toString(),
                title: 'Hacked Card'
            })

        expect(res.status).toBe(StatusCodes.FORBIDDEN)

        const cardsInDb = await GET_DB().collection('cards').find({ boardId: testBoard._id }).toArray()
        expect(cardsInDb.some(c => c.title === 'Hacked Card')).toBe(false)

        await GET_DB().collection('users').deleteOne({ _id: strangerUser._id })
    })
})