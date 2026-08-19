import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import ApiError from '~/utils/ApiError'
import { createTestUser } from '../../helpers/createTestUser'

describe('Service Integration: userService.login', () => {
    const rawPassword = 'Password123!'

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        await GET_DB().collection('users').deleteMany({
            email: { $in: ['active_login_service@test.com', 'inactive_login_service@test.com'] }
        })

        await createTestUser({
            email: 'active_login_service@test.com',
            password: rawPassword,
            isActive: true,
            displayName: 'Active Login Service User'
        })

        await createTestUser({
            email: 'inactive_login_service@test.com',
            password: rawPassword,
            isActive: false,
            displayName: 'Inactive Login Service User'
        })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should return user info and JWT tokens when login credentials are valid and account is active', async () => {
        const result = await userService.login({
            email: 'active_login_service@test.com',
            password: rawPassword
        })

        expect(result.accessToken).toBeDefined()
        expect(result.refreshToken).toBeDefined()
        expect(result.email).toBe('active_login_service@test.com')
        expect(result.password).toBeUndefined()
    })

    it('Should throw ApiError 404 NOT_FOUND when email does not exist', async () => {
        await expect(
            userService.login({ email: 'nonexistent@test.com', password: rawPassword })
        ).rejects.toThrow(ApiError)

        await expect(
            userService.login({ email: 'nonexistent@test.com', password: rawPassword })
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_FOUND,
            message: 'Account not found!'
        })
    })

    it('Should throw ApiError 406 NOT_ACCEPTABLE when account is not active', async () => {
        await expect(
            userService.login({ email: 'inactive_login_service@test.com', password: rawPassword })
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_ACCEPTABLE,
            message: 'Your account is not active!'
        })
    })

    it('Should throw ApiError 406 NOT_ACCEPTABLE when password is incorrect', async () => {
        await expect(
            userService.login({ email: 'active_login_service@test.com', password: 'WrongPassword123!' })
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_ACCEPTABLE,
            message: 'Your Email or Password is incorrect!'
        })
    })
})