import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { cardService } from '~/services/cardService'

const request = supertest(app)

describe('API Integration: GET /v1/cards/:columnId/archivedCards', () => {
    let testUser
    let accessToken
    let testBoard
    let testColumn
    let anotherColumn

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        testColumn = await createTestColumn({ boardId: testBoard._id })
        anotherColumn = await createTestColumn({ boardId: testBoard._id })
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

    it('Should return 200 OK and get archived cards of the column', async () => {
        const card1 = await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Archived Card 1'
        })

        const card2 = await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Archived Card 2'
        })

        await cardService.archive(card1._id.toString())
        await cardService.archive(card2._id.toString())

        const res = await request
            .get(`/v1/cards/${testColumn._id}/archivedCards`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        expect(res.body).toHaveLength(2)

        expect(res.body.map(card => card._id)).toEqual(
            expect.arrayContaining([
                card1._id.toString(),
                card2._id.toString()
            ])
        )
    })

    it('Should not return active cards', async () => {
        const archivedCard = await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Archived Card'
        })

        await cardService.archive(archivedCard._id.toString())

        await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Active Card'
        })

        const res = await request
            .get(`/v1/cards/${testColumn._id}/archivedCards`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)

        expect(res.body).toHaveLength(1)
        expect(res.body[0]._id).toBe(archivedCard._id.toString())
    })

    it('Should not return destroyed cards', async () => {
        const archivedCard = await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: testColumn._id.toString(),
            title: 'Archived Card'
        })

        await cardService.archive(archivedCard._id.toString())

        await GET_DB().collection('cards').updateOne(
            { _id: archivedCard._id },
            { $set: { _destroy: true } }
        )

        const res = await request
            .get(`/v1/cards/${testColumn._id}/archivedCards`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body).toHaveLength(0)
    })

    it('Should not return archived cards from another column', async () => {
        const archivedCard = await cardService.createNew({
            boardId: testBoard._id.toString(),
            columnId: anotherColumn._id.toString(),
            title: 'Archived Card'
        })

        await cardService.archive(archivedCard._id.toString())

        const res = await request
            .get(`/v1/cards/${testColumn._id}/archivedCards`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body).toHaveLength(0)
    })

    it('Should return 422 when column id is invalid', async () => {
        const res = await request
            .get('/v1/cards/invalid-column-id/archivedCards')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .get(`/v1/cards/${testColumn._id}/archivedCards`)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
})