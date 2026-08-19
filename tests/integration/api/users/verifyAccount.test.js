import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { createTestUser } from '../../helpers/createTestUser'

const request = supertest(app)

describe('API Integration: PUT /v1/users/verify', () => {
    const rawPassword = 'Password123!'

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        await GET_DB().collection('users').deleteMany({
            email: {
                $in: [
                    'unverified@test.com',
                    'already_active@test.com',
                    'invalid_token@test.com'
                ]
            }
        })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should return 200 OK when email and token are valid', async () => {
        const mockToken = 'valid-secret-token-123'
        await createTestUser({
            email: 'unverified@test.com',
            password: rawPassword,
            username: 'unverified',
            displayName: 'unverified',
            isActive: false,
            verifyToken: mockToken
        })

        const res = await request
            .put('/v1/users/verify')
            .send({
                email: 'unverified@test.com',
                token: mockToken
            })

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.email).toBe('unverified@test.com')
        expect(res.body.isActive).toBe(true)
        expect(res.body.verifyToken).toBeUndefined()

        const userInDb = await GET_DB().collection('users').findOne({ email: 'unverified@test.com' })
        expect(userInDb.isActive).toBe(true)
        expect(userInDb.verifyToken).toBeNull()
    })

    it('Should return 422 UNPROCESSABLE_ENTITY when payload is invalid', async () => {
        const res = await request
            .put('/v1/users/verify')
            .send({
                email: 'invalid-email',
                token: ''
            })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should return 404 NOT_FOUND when account does not exist', async () => {
        const res = await request
            .put('/v1/users/verify')
            .send({
                email: 'nonexistent@test.com',
                token: 'some-token'
            })

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
        expect(res.body.message).toBe('Account not found!')
    })

    it('Should return 406 NOT_ACCEPTABLE when account is already active', async () => {
        await createTestUser({
            email: 'already_active@test.com',
            password: rawPassword,
            username: 'activeuser',
            displayName: 'Active User',
            isActive: true,
            verifyToken: null
        })

        const res = await request
            .put('/v1/users/verify')
            .send({
                email: 'already_active@test.com',
                token: 'some-token'
            })

        expect(res.status).toBe(StatusCodes.NOT_ACCEPTABLE)
        expect(res.body.message).toBe('Your account is already active!')
    })

    it('Should return 406 NOT_ACCEPTABLE when token does not match', async () => {
        await createTestUser({
            email: 'invalid_token@test.com',
            password: rawPassword,
            username: 'wrongtoken',
            displayName: 'Wrong Token',
            isActive: false,
            verifyToken: 'correct-token'
        })

        const res = await request
            .put('/v1/users/verify')
            .send({
                email: 'invalid_token@test.com',
                token: 'wrong-token-sent-by-user'
            })

        expect(res.status).toBe(StatusCodes.NOT_ACCEPTABLE)
        expect(res.body.message).toBe('Token is invalid')
    })
})