import supertest from 'supertest'
import app from '~/app'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'
import { BrevoProvider } from '~/providers/BrevoProvider'

jest.mock('~/providers/BrevoProvider', () => ({
    BrevoProvider: {
        sendEmail: jest.fn().mockResolvedValue(true)
    }
}))

const request = supertest(app)

describe('API Integration: POST /v1/users/register', () => {
    beforeAll(async () => {
        await CONNECT_DB()
    })

    // Reset lại lịch sử gọi Mock và dọn dẹp dữ liệu DB trước MỖI test case
    beforeEach(async () => {
        jest.clearAllMocks()

        await GET_DB().collection('users').deleteMany({
            email: {
                $in: [
                    'integration@test.com',
                    'duplicate@test.com'
                ]
            }
        })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should return 201 Created when request is valid', async () => {
        const res = await request
            .post('/v1/users/register')
            .send({
                email: 'integration@test.com',
                password: 'Password123!'
            })

        expect(res.status).toBe(StatusCodes.CREATED)

        // Kiểm tra dữ liệu trả về đúng
        expect(res.body).toHaveProperty('_id')
        expect(res.body.email).toBe('integration@test.com')

        // Tăng độ tin cậy: Đảm bảo không lộ thông tin nhạy cảm
        expect(res.body.password).toBeUndefined()
        expect(res.body.verifyToken).toBeUndefined()

        // Kiểm tra email service có được gọi
        expect(BrevoProvider.sendEmail).toHaveBeenCalledTimes(1)
    })

    it('Should return 422 when request body is invalid', async () => {
        const res = await request
            .post('/v1/users/register')
            .send({
                email: 'invalid-email',
                password: '123'
            })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(BrevoProvider.sendEmail).not.toHaveBeenCalled()
    })

    it('Should return 409 when email already exists', async () => {
        // Seed dữ liệu trùng trước khi test
        await GET_DB().collection('users').insertOne({
            email: 'duplicate@test.com',
            password: 'hashed-password',
            username: 'duplicate',
            displayName: 'duplicate',
            isActive: false,
            _destroy: false
        })

        const res = await request
            .post('/v1/users/register')
            .send({
                email: 'duplicate@test.com',
                password: 'Password123!'
            })

        expect(res.status).toBe(StatusCodes.CONFLICT)

        expect(BrevoProvider.sendEmail).not.toHaveBeenCalled()
    })
})