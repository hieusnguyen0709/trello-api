import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { userService } from '~/services/userService'
import { createTestUser } from '../../helpers/createTestUser'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import { ObjectId } from 'mongodb'

describe('Service Integration: userService.refreshToken', () => {
    const testEmail = 'refresh_token_service@test.com'
    const refreshTokenSecret = env.REFRESH_TOKEN_SECRET_SIGNATURE || env.REFRESH_TOKEN_SECRET_KEY || 'defaultRefreshTokenSecretKey'

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        await GET_DB().collection('users').deleteMany({
            email: { $in: [testEmail] }
        })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should return new accessToken successfully when valid refreshToken is provided', async () => {
        const createdUser = await createTestUser({
            email: testEmail,
            username: 'refresh_user'
        })

        const validRefreshToken = await JwtProvider.generateToken(
            { _id: createdUser._id.toString(), email: createdUser.email },
            refreshTokenSecret,
            '1d'
        )

        const result = await userService.refreshToken(validRefreshToken)

        expect(result).toBeDefined()
        expect(result.accessToken).toBeDefined()
        expect(typeof result.accessToken).toBe('string')
    })

    it('Should throw error when refreshToken is invalid', async () => {
        const invalidRefreshToken = 'invalid.jwt.token'

        await expect(
            userService.refreshToken(invalidRefreshToken)
        ).rejects.toThrow()
    })

    it('Should throw error when refreshToken is expired', async () => {
        const createdUser = await createTestUser({
            email: testEmail,
            username: 'expired_token_user'
        })

        const expiredRefreshToken = await JwtProvider.generateToken(
            { _id: createdUser._id.toString(), email: createdUser.email },
            refreshTokenSecret,
            '-1s'
        )

        await expect(
            userService.refreshToken(expiredRefreshToken)
        ).rejects.toThrow()
    })

    it('Should return new accessToken when valid refreshToken is provided even if user is not verified against DB', async () => {
        const nonExistentUserId = new ObjectId().toString()

        const orphanRefreshToken = await JwtProvider.generateToken(
            { _id: nonExistentUserId, email: 'ghost@test.com' },
            refreshTokenSecret,
            '1d'
        )

        const result = await userService.refreshToken(orphanRefreshToken)

        expect(result).toBeDefined()
        expect(result.accessToken).toBeDefined()
        expect(typeof result.accessToken).toBe('string')
    })
})