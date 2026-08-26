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

describe('API Integration: DELETE /v1/cards/:id', () => {
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
            title: 'Card To Delete'
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

    it('Should return 200 OK and delete the card', async () => {
        const res = await request
            .delete(`/v1/cards/${testCard._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body).toEqual({
            deleteResult: 'Card deleted successfully!'
        })

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })

        expect(cardInDb).toBeNull()
    })

    it('Should remove the deleted card ID from column cardOrderIds', async () => {
        const res = await request
            .delete(`/v1/cards/${testCard._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        const columnInDb = await GET_DB().collection('columns').findOne({ _id: testColumn._id })

        expect(columnInDb.cardOrderIds.map(String))
            .not.toContain(testCard._id.toString())
    })

    it('Should return 404 when the card does not exist', async () => {
        const nonExistentCardId = new ObjectId().toString()

        const res = await request
            .delete(`/v1/cards/${nonExistentCardId}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('Should return 422 when card id is invalid', async () => {
        const res = await request
            .delete('/v1/cards/invalid-card-id')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .delete(`/v1/cards/${testCard._id}`)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
})
