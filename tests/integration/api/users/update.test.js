import supertest from 'supertest'
import bcryptjs from 'bcryptjs'
import { ObjectId } from 'mongodb'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestUser } from '../../helpers/createTestUser'

// Mock CloudinaryProvider để tránh upload ảnh thật
jest.mock('~/providers/CloudinaryProvider', () => ({
    CloudinaryProvider: {
        streamUpload: jest.fn().mockResolvedValue({
            secure_url: 'https://res.cloudinary.com/demo/image/upload/v123456/users/avatar-test.jpg'
        })
    }
}))

const request = supertest(app)

describe('API Integration: PUT /v1/users/update', () => {
    const rawPassword = 'Password123!'
    const newPassword = 'NewPassword123!'
    let activeUser
    let accessToken

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        jest.clearAllMocks()

        await GET_DB().collection('users').deleteMany({
            email: {
                $in: [
                    'update_api@test.com',
                    'inactive_update_api@test.com'
                ]
            }
        })

        // Seed user chuẩn để test
        const createdUser = await createTestUser({
            email: 'update_api@test.com',
            password: rawPassword,
            username: 'update_api',
            displayName: 'Original Name',
            isActive: true
        })

        activeUser = {
            _id: createdUser._id,
            email: 'update_api@test.com'
        }

        // Tạo access token từ helper
        accessToken = await createTestToken(activeUser)
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should return 200 OK when updating basic profile info', async () => {
        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({
                displayName: 'Updated Name'
            })

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.displayName).toBe('Updated Name')

        // Kiểm tra thực tế trong DB
        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(activeUser._id) })
        expect(dbUser.displayName).toBe('Updated Name')
    })

    it('Should return 200 OK when updating password with valid current_password', async () => {
        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({
                current_password: rawPassword,
                new_password: newPassword
            })

        expect(res.status).toBe(StatusCodes.OK)

        // Kiểm tra mật khẩu mới đã băm và lưu vào DB
        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(activeUser._id) })
        expect(bcryptjs.compareSync(newPassword, dbUser.password)).toBeTruthy()
    })

    it('Should return 200 OK when uploading avatar file', async () => {
        const fakeImageBuffer = Buffer.from('fake image content')

        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .attach('avatar', fakeImageBuffer, 'avatar.png')

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.avatar).toBe('https://res.cloudinary.com/demo/image/upload/v123456/users/avatar-test.jpg')
        expect(CloudinaryProvider.streamUpload).toHaveBeenCalledTimes(1)
    })

    it('Should return 401 UNAUTHORIZED when no authorization token is provided', async () => {
        const res = await request
            .put('/v1/users/update')
            .send({
                displayName: 'Unauthorized Name'
            })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
        expect(res.body.message).toMatch(/Unauthorized!/i)
    })

    it('Should return 406 NOT_ACCEPTABLE when current_password is incorrect', async () => {
        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({
                current_password: 'WrongPassword123!',
                new_password: 'NewPassword123!'
            })

        expect(res.status).toBe(StatusCodes.NOT_ACCEPTABLE)
        expect(res.body.message).toBe('Your Current Password is incorrect!')
    })

    it('Should return 422 UNPROCESSABLE_ENTITY when new_password format is invalid', async () => {
        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({
                current_password: rawPassword,
                new_password: '123'
            })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('Should not allow updating the user role', async () => {
        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ role: 'admin' })

        expect(res.status).toBe(StatusCodes.OK)

        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(activeUser._id) })
        expect(dbUser.role).toBe('client')
    })

    it('Should not persist current_password when new_password is missing', async () => {
        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ current_password: rawPassword })

        expect(res.status).toBe(StatusCodes.OK)

        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(activeUser._id) })
        expect(bcryptjs.compareSync(rawPassword, dbUser.password)).toBeTruthy()
        expect(dbUser.current_password).toBeUndefined()
        expect(dbUser.new_password).toBeUndefined()
    })

    it('Should not persist new_password when current_password is missing', async () => {
        const res = await request
            .put('/v1/users/update')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ new_password: newPassword })

        expect(res.status).toBe(StatusCodes.OK)

        const dbUser = await GET_DB().collection('users').findOne({ _id: new ObjectId(activeUser._id) })
        expect(bcryptjs.compareSync(rawPassword, dbUser.password)).toBeTruthy()
        expect(dbUser.current_password).toBeUndefined()
        expect(dbUser.new_password).toBeUndefined()
    })
})
