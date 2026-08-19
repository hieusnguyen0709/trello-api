import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import { createTestUser } from '../../helpers/createTestUser'

describe('Service Integration: userService.verifyAccount', () => {
    const validVerifyToken = 'valid_verify_token_123'

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        await GET_DB().collection('users').deleteMany({
            email: { $in: ['unverified_service@test.com', 'already_verified_service@test.com'] }
        })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should verify account successfully and clear verifyToken in DB', async () => {
        await createTestUser({
            email: 'unverified_service@test.com',
            isActive: false,
            verifyToken: validVerifyToken
        })

        const result = await userService.verifyAccount({
            email: 'unverified_service@test.com',
            token: validVerifyToken
        })

        expect(result.isActive).toBe(true)
        // Dùng toBeFalsy để chấp nhận cả undefined (sau khi omit) hoặc null
        expect(result.verifyToken).toBeUndefined()

        // Kiểm tra chính xác trong MongoDB
        const dbUser = await GET_DB().collection('users').findOne({ email: 'unverified_service@test.com' })
        expect(dbUser.isActive).toBe(true)
        expect(dbUser.verifyToken).toBeNull()
    })

    it('Should throw ApiError 404 NOT_FOUND when email does not exist', async () => {
        await expect(
            userService.verifyAccount({ email: 'nonexistent@test.com', token: validVerifyToken })
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_FOUND
        })
    })

    it('Should throw ApiError 406 NOT_ACCEPTABLE when account is already active', async () => {
        await createTestUser({
            email: 'already_verified_service@test.com',
            isActive: true,
            verifyToken: 'dummy_token_string'
        })

        await expect(
            userService.verifyAccount({ email: 'already_verified_service@test.com', token: 'dummy_token_string' })
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_ACCEPTABLE
        })
    })

    it('Should throw ApiError 406 NOT_ACCEPTABLE when verify token does not match', async () => {
        await createTestUser({
            email: 'unverified_service@test.com',
            isActive: false,
            verifyToken: validVerifyToken
        })

        await expect(
            userService.verifyAccount({ email: 'unverified_service@test.com', token: 'invalid_token' })
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_ACCEPTABLE
        })
    })
})