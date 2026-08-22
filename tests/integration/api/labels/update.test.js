import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestLabel } from '../../helpers/createTestLabel'

const request = supertest(app)

describe('API Integration: PUT /v1/labels/:id', () => {
    let testUser
    let accessToken
    let testBoard
    let testLabel

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        testLabel = await createTestLabel({ boardId: testBoard._id, title: 'Bug', color: '#FF0000' })
    })

    afterEach(async () => {
        await GET_DB().collection('labels').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        await CLOSE_DB()
    })

    it('Should return 200 OK and update the label title', async () => {
        const res = await request
            .put(`/v1/labels/${testLabel._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ title: 'Critical Bug' })

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.title).toBe('Critical Bug')

        const labelInDb = await GET_DB().collection('labels').findOne({ _id: testLabel._id })
        expect(labelInDb.title).toBe('Critical Bug')
    })

    it('Should return 400 when both title and color are missing from body', async () => {
        const res = await request
            .put(`/v1/labels/${testLabel._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({})

        expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('Should return 422 when color format is invalid', async () => {
        const res = await request
            .put(`/v1/labels/${testLabel._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ color: 'not-a-hex-color' })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 401 when access token is missing', async () => {
        const res = await request
            .put(`/v1/labels/${testLabel._id}`)
            .send({ title: 'New Title' })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
})