import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { cardService } from '~/services/cardService'
import { ObjectId } from 'mongodb'

const request = supertest(app)

describe('API Integration: PUT /v1/cards/:id/archive', () => {
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
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        testColumn = await createTestColumn({ boardId: testBoard._id })

        testCard = await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Card To Archive'
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

    it('Should return 200 OK and archive the card', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}/archive`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })

        expect(cardInDb).not.toBeNull()
        expect(cardInDb.archivedAt).toBeDefined()
        expect(cardInDb.archivedAt).not.toBeNull()
    })

    it('Should set updatedAt when archiving the card', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}/archive`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })

        expect(cardInDb.updatedAt).toBeDefined()
        expect(cardInDb.updatedAt).not.toBeNull()
    })

    it('Should not delete the card from database when archived', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}/archive`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })

        expect(cardInDb).not.toBeNull()
    })

    it('Should return 404 when the card does not exist', async () => {
        const nonExistentCardId = new ObjectId().toString()

        const res = await request
            .put(`/v1/cards/${nonExistentCardId}/archive`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('Should return 422 when card id is invalid', async () => {
        const res = await request
            .put('/v1/cards/invalid-card-id/archive')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}/archive`)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
})