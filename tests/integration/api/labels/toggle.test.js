import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { createTestLabel } from '../../helpers/createTestLabel'

const request = supertest(app)

describe('API Integration: POST /v1/labels/toggle', () => {
    let testUser
    let accessToken
    let testBoard
    let testColumn
    let testCard
    let testLabel

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        testColumn = await createTestColumn({ boardId: testBoard._id })
        testCard = await createTestCard({ boardId: testBoard._id, columnId: testColumn._id, title: 'API Toggle Card' })
        testLabel = await createTestLabel({ boardId: testBoard._id, title: 'Bug', color: '#FF0000' })
    })

    afterEach(async () => {
        await GET_DB().collection('cards').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('labels').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        await CLOSE_DB()
    })

    it('Return 200 OK and add labelId to the card', async () => {
        const res = await request
            .post('/v1/labels/toggle')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ cardId: testCard._id.toString(), labelId: testLabel._id.toString() })

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.labelIds).toContain(testLabel._id.toString())

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.labelIds.map(String)).toContain(testLabel._id.toString())
    })

    it('Return 422 when cardId is not a valid ObjectId format', async () => {
        const res = await request
            .post('/v1/labels/toggle')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ cardId: 'not-an-object-id', labelId: testLabel._id.toString() })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Return 422 when labelId is missing', async () => {
        const res = await request
            .post('/v1/labels/toggle')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ cardId: testCard._id.toString() })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Return 404 when card does not exist', async () => {
        const fakeCardId = '6a882b81f1c8967a561e6799'

        const res = await request
            .post('/v1/labels/toggle')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ cardId: fakeCardId, labelId: testLabel._id.toString() })

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('Return 401 when access token is missing', async () => {
        const res = await request
            .post('/v1/labels/toggle')
            .send({ cardId: testCard._id.toString(), labelId: testLabel._id.toString() })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Return 403 when user is not an owner/member of the board', async () => {
        const strangerUser = await createTestUser()
        const strangerToken = await createTestToken(strangerUser)

        const res = await request
            .post('/v1/labels/toggle')
            .set('Cookie', [`accessToken=${strangerToken}`])
            .send({ cardId: testCard._id.toString(), labelId: testLabel._id.toString() })

        expect(res.status).toBe(StatusCodes.FORBIDDEN)

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.labelIds).toHaveLength(0)

        await GET_DB().collection('users').deleteOne({ _id: strangerUser._id })
    })
})