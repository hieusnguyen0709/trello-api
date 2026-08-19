import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'

const request = supertest(app)

describe('API Integration: GET /v1/users/refresh_token', () => {
    let validRefreshToken

    beforeAll(async () => {
        await CONNECT_DB()

        const mockUserInfo = {
            _id: '654321098765432109876543',
            email: 'refresh_test@gmail.com'
        }

        const refreshSecret = process.env.REFRESH_TOKEN_SECRET_SIGNATURE || env.REFRESH_TOKEN_SECRET_SIGNATURE
        const refreshLife = process.env.REFRESH_TOKEN_LIFE || env.REFRESH_TOKEN_LIFE

        validRefreshToken = await JwtProvider.generateToken(
            mockUserInfo,
            refreshSecret,
            refreshLife
        )
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should return 200 OK and set new accessToken cookie when refreshToken in Cookie is valid', async () => {
        const res = await request
            .get('/v1/users/refresh_token')
            .set('Cookie', [`refreshToken=${validRefreshToken}`])

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body).toHaveProperty('accessToken')
        expect(typeof res.body.accessToken).toBe('string')

        const cookies = res.headers['set-cookie']
        expect(cookies).toBeDefined()
        expect(cookies.some(cookie => cookie.startsWith('accessToken='))).toBeTruthy()
    })

    it('Should return 403 FORBIDDEN when no refreshToken cookie is provided', async () => {
        const res = await request
            .get('/v1/users/refresh_token')

        expect(res.status).toBe(StatusCodes.FORBIDDEN)
        expect(res.body.message).toMatch(/Please Sign In!/i)
    })

    it('Should return 403 FORBIDDEN when refreshToken is invalid or tampered', async () => {
        const invalidRefreshToken = 'invalid.token.signature'

        const res = await request
            .get('/v1/users/refresh_token')
            .set('Cookie', [`refreshToken=${invalidRefreshToken}`])

        expect(res.status).toBe(StatusCodes.FORBIDDEN)
        expect(res.body.message).toMatch(/Please Sign In!/i)
    })
})