import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import { BrevoProvider } from '~/providers/BrevoProvider'
import ApiError from '~/utils/ApiError'
import { createTestUser } from '../../helpers/createTestUser'

describe('Service Integration: userService.createNew', () => {
    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        await GET_DB().collection('users').deleteMany({
            email: { $in: ['create_service@test.com'] }
        })

        // Mock hàm gửi email để không thực hiện HTTP request thật tới Brevo
        jest.spyOn(BrevoProvider, 'sendEmail').mockImplementation(() => Promise.resolve(true))
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should create new user successfully when email is unique', async () => {
        const reqBody = {
            email: 'create_service@test.com',
            password: 'Password123!',
            username: 'create_service'
        }

        const result = await userService.createNew(reqBody)

        expect(result).toBeDefined()
        expect(result.email).toBe('create_service@test.com')
        expect(result.isActive).toBeFalsy()

        // Verify hàm gửi email đã được gọi 1 lần
        expect(BrevoProvider.sendEmail).toHaveBeenCalledTimes(1)

        const dbUser = await GET_DB().collection('users').findOne({ email: 'create_service@test.com' })
        expect(dbUser).not.toBeNull()
    })

    it('Should throw ApiError 409 CONFLICT when email already exists', async () => {
        await createTestUser({
            email: 'create_service@test.com',
            username: 'existing_user'
        })

        const reqBody = {
            email: 'create_service@test.com',
            password: 'Password123!',
            username: 'new_username'
        }

        await expect(userService.createNew(reqBody)).rejects.toThrow(ApiError)
        await expect(userService.createNew(reqBody)).rejects.toMatchObject({
            statusCode: StatusCodes.CONFLICT,
            message: 'Email already exists!'
        })
    })
})