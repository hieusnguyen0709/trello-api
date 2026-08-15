import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { StatusCodes } from 'http-status-codes'

const request = supertest(app)

describe('API Integration: GET /v1/boards', () => {
    let testUser
    let accessToken
    const createdBoardIds = []

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)

        const result = await GET_DB().collection('boards').insertMany([
            {
                title: 'Project Management',
                type: 'public',
                ownerIds: [testUser._id],
                _destroy: false
            },
            {
                title: 'Personal Task',
                type: 'private',
                ownerIds: [testUser._id],
                _destroy: false
            }
        ])
        Object.values(result.insertedIds).forEach(id => createdBoardIds.push(id))
    })

    afterAll(async () => {
        if (createdBoardIds.length > 0) {
            await GET_DB().collection('boards').deleteMany({ _id: { $in: createdBoardIds } })
        }
        if (testUser) await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        await CLOSE_DB()
    })

    it('Should return 200 OK and board list with pagination default metadata', async () => {
        const res = await request
            .get('/v1/boards')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK) // 200
        expect(res.body).toHaveProperty('boards')
        expect(res.body).toHaveProperty('totalBoards')
        expect(res.body.boards).toHaveLength(2)
    })

    it('Should return 200 OK with filtered results when query params are provided', async () => {
        const res = await request
            .get('/v1/boards?page=1&itemsPerPage=1&q[title]=Project')
            .set('Cookie', [`accessToken=${accessToken}`])

        expect(res.status).toBe(StatusCodes.OK) // 200
        expect(res.body.totalBoards).toBe(1)
        expect(res.body.boards).toHaveLength(1)
        expect(res.body.boards[0].title).toBe('Project Management')
    })

    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request.get('/v1/boards')
        expect(res.status).toBe(StatusCodes.UNAUTHORIZED) // 401
    })
})