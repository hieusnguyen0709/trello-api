import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestLabel } from '../../helpers/createTestLabel'

const request = supertest(app)

describe('API Integration: DELETE /v1/labels/:id', () => {
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

    it('Return 200 OK and permanently remove the label', async () => {
        const res = await request
            .delete(`/v1/labels/${testLabel._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.message).toBe('Label deleted successfully')

        const labelInDb = await GET_DB().collection('labels').findOne({ _id: testLabel._id })
        expect(labelInDb).toBeNull()
    })

    it('Return 401 when access token is missing', async () => {
        const res = await request.delete(`/v1/labels/${testLabel._id}`)

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })
})