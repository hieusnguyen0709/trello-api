import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { ObjectId } from 'mongodb'

const request = supertest(app)

describe('API Integration: POST /v1/labels', () => {
    let testUser
    let accessToken
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
    })

    afterEach(async () => {
        await GET_DB().collection('labels').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        await CLOSE_DB()
    })

    it('Should return 201 Created and persist the label', async () => {
        const res = await request
            .post('/v1/labels')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ boardId: testBoard._id.toString(), title: 'Bug', color: '#FF0000' })

        expect(res.status).toBe(StatusCodes.CREATED)
        expect(res.body.title).toBe('Bug')

        const labelInDb = await GET_DB().collection('labels').findOne({ _id: new ObjectId(res.body._id) })
        expect(labelInDb).not.toBeNull()
        expect(labelInDb.title).toBe('Bug')
    })

    it('Should return 409 when label with same title/color already exists', async () => {
        await request
            .post('/v1/labels')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ boardId: testBoard._id.toString(), title: 'Bug', color: '#FF0000' })

        const res = await request
            .post('/v1/labels')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ boardId: testBoard._id.toString(), title: 'Bug', color: '#FF0000' })

        expect(res.status).toBe(StatusCodes.CONFLICT)
    })

    it('Should return 422 when title is missing', async () => {
        const res = await request
            .post('/v1/labels')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ boardId: testBoard._id.toString(), color: '#FF0000' })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 422 when color is not a valid hex format', async () => {
        const res = await request
            .post('/v1/labels')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ boardId: testBoard._id.toString(), title: 'Bug', color: 'not-a-color' })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 422 when boardId is not a valid ObjectId format', async () => {
        const res = await request
            .post('/v1/labels')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ boardId: 'not-an-object-id', title: 'Bug', color: '#FF0000' })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 401 when access token is missing', async () => {
        const res = await request
            .post('/v1/labels')
            .send({ boardId: testBoard._id.toString(), title: 'Bug', color: '#FF0000' })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('Return 403 when user is not an owner/member of the board', async () => {
        const strangerUser = await createTestUser()
        const strangerToken = await createTestToken(strangerUser)

        const res = await request
            .post('/v1/labels')
            .set('Cookie', [`accessToken=${strangerToken}`])
            .send({ boardId: testBoard._id.toString(), title: 'Hacked Label', color: '#000000' })

        expect(res.status).toBe(StatusCodes.FORBIDDEN)

        const labelsInDb = await GET_DB().collection('labels').find({ boardId: testBoard._id }).toArray()
        expect(labelsInDb.some(l => l.title === 'Hacked Label')).toBe(false)

        await GET_DB().collection('users').deleteOne({ _id: strangerUser._id })
    })
})