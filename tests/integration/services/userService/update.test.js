import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import { createTestUser } from '../../helpers/createTestUser'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider' // Điều chỉnh import theo Provider thực tế của dự án

describe('Service Integration: userService.update', () => {
    const testEmail = 'update_service_full@test.com'
    const originalPassword = 'Password123!'

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        await GET_DB().collection('users').deleteMany({
            email: { $in: [testEmail] }
        })

        // Mock upload avatar lên Cloud (tránh gọi API Cloudinary thực tế)
        if (CloudinaryProvider?.streamUpload) {
            jest.spyOn(CloudinaryProvider, 'streamUpload').mockImplementation(() =>
                Promise.resolve({ secure_url: 'https://cloudinary.com/mock-avatar.png' })
            )
        }
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should update basic user profile info successfully and omit password from returned result', async () => {
        // 1. Tạo user ban đầu
        const createdUser = await createTestUser({
            email: testEmail,
            username: 'original_user',
            displayName: 'Original Name',
            password: originalPassword
        })

        const reqBody = {
            displayName: 'Updated Display Name'
        }

        // 2. Gọi service update
        const updatedUser = await userService.update(createdUser._id.toString(), reqBody)

        // 3. Assert kết quả trả về
        expect(updatedUser).toBeDefined()
        expect(updatedUser.displayName).toBe(reqBody.displayName)
        expect(updatedUser.password).toBeUndefined() // Mật khẩu không được trả về client

        // 4. Kiểm tra trực tiếp trong DB
        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(createdUser._id) })
        expect(dbUser.displayName).toBe(reqBody.displayName)
    })

    it('Should update avatar successfully when file is provided', async () => {
        const createdUser = await createTestUser({
            email: testEmail,
            username: 'avatar_user'
        })

        const mockUserAvatarFile = {
            fieldname: 'avatar',
            originalname: 'avatar.png',
            mimetype: 'image/png',
            buffer: Buffer.from('mock_image_buffer')
        }

        const reqBody = {} // Có thể rỗng hoặc chứa các trường khác

        const updatedUser = await userService.update(createdUser._id.toString(), reqBody, mockUserAvatarFile)

        expect(updatedUser).toBeDefined()
        expect(updatedUser.avatar).toBeDefined()

        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(createdUser._id) })
        expect(dbUser.avatar).not.toBeNull()
    })

    it('Should update password successfully when current_password and new_password are correct', async () => {
        const createdUser = await createTestUser({
            email: testEmail,
            username: 'password_user',
            password: originalPassword
        })

        const newPassword = 'NewPassword123!'
        const reqBody = {
            current_password: originalPassword,
            new_password: newPassword
        }

        const updatedUser = await userService.update(createdUser._id.toString(), reqBody)

        expect(updatedUser).toBeDefined()
        expect(updatedUser.password).toBeUndefined()

        // Kiểm tra mật khẩu mới đã được bcrypt hash thành công trong DB
        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(createdUser._id) })
        const isMatch = bcrypt.compareSync(newPassword, dbUser.password)
        expect(isMatch).toBe(true)
    })

    it('Should throw ApiError 406 NOT_ACCEPTABLE when current_password is wrong', async () => {
        const createdUser = await createTestUser({
            email: testEmail,
            username: 'wrong_pwd_user',
            password: originalPassword
        })

        const reqBody = {
            current_password: 'WrongCurrentPassword123!',
            new_password: 'NewPassword123!'
        }

        await expect(
            userService.update(createdUser._id.toString(), reqBody)
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_ACCEPTABLE
        })
    })

    it('Should throw ApiError 404 NOT_FOUND when userId does not exist in DB', async () => {
        const nonExistentId = new ObjectId().toString()
        const reqBody = {
            displayName: 'Ghost User'
        }

        await expect(
            userService.update(nonExistentId, reqBody)
        ).rejects.toMatchObject({
            statusCode: StatusCodes.NOT_FOUND
        })
    })
})