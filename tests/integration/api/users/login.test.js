import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { createTestUser } from '../../helpers/createTestUser'

const request = supertest(app)

describe('API Integration: POST /v1/users/login', () => {
    const rawPassword = 'Password123!'

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        await GET_DB().collection('users').deleteMany({
            email: {
                $in: [
                    'active_login@test.com',
                    'inactive_login@test.com'
                ]
            }
        })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('should return 200 OK and set cookies when credentials are valid', async () => {
        await createTestUser({
            email: 'active_login@test.com',
            password: rawPassword,
            username: 'active_login',
            displayName: 'Active User',
            isActive: true
        })

        const res = await request
            .post('/v1/users/login')
            .send({
                email: 'active_login@test.com',
                password: rawPassword
            })

        expect(res.status).toBe(StatusCodes.OK)

        expect(res.body).toHaveProperty('accessToken')
        expect(res.body).toHaveProperty('refreshToken')
        expect(res.body.email).toBe('active_login@test.com')
        expect(res.body.password).toBeUndefined()

        const cookies = res.headers['set-cookie']
        expect(cookies).toBeDefined()
        expect(cookies.some(cookie => cookie.startsWith('accessToken='))).toBeTruthy()
        expect(cookies.some(cookie => cookie.startsWith('refreshToken='))).toBeTruthy()
    })

    it('should return 422 UNPROCESSABLE_ENTITY when email or password format is invalid', async () => {
        const res = await request
            .post('/v1/users/login')
            .send({
                email: 'invalid-email-format',
                password: '123'
            })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 404 NOT_FOUND when account does not exist', async () => {
        const res = await request
            .post('/v1/users/login')
            .send({
                email: 'nonexistent@test.com',
                password: rawPassword
            })

        expect(res.status).toBe(StatusCodes.NOT_FOUND)
        expect(res.body.message).toBe('Account not found!')
    })

    it('should return 406 NOT_ACCEPTABLE when account is not active', async () => {
        await createTestUser({
            email: 'inactive_login@test.com',
            password: rawPassword,
            username: 'inactive_login',
            displayName: 'Inactive User',
            isActive: false
        })

        const res = await request
            .post('/v1/users/login')
            .send({
                email: 'inactive_login@test.com',
                password: rawPassword
            })

        expect(res.status).toBe(StatusCodes.NOT_ACCEPTABLE)
        expect(res.body.message).toBe('Your account is not active!')
    })

    it('should return 406 NOT_ACCEPTABLE when password is incorrect', async () => {
        await createTestUser({
            email: 'active_login@test.com',
            password: rawPassword,
            username: 'active_login',
            displayName: 'Active User',
            isActive: true
        })

        const res = await request
            .post('/v1/users/login')
            .send({
                email: 'active_login@test.com',
                password: 'WrongPassword123!'
            })

        expect(res.status).toBe(StatusCodes.NOT_ACCEPTABLE)
        expect(res.body.message).toBe('Your Email or Password is incorrect!')
    })
})