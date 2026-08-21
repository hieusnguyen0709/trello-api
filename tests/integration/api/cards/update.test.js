import supertest from 'supertest'
import app from '~/app'
import { StatusCodes } from 'http-status-codes'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestToken } from '../../helpers/createTestToken'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

const request = supertest(app)

describe('API Integration: PUT /v1/cards/:id', () => {
    let testUser
    let accessToken
    let testBoard
    let testColumn
    let testCard

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        accessToken = await createTestToken(testUser)

        jest.spyOn(CloudinaryProvider, 'streamUpload').mockImplementation(async (buffer, folder) => ({
            secure_url: `https://res.cloudinary.com/test/${folder}/mock-file.png`
        }))
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        testColumn = await createTestColumn({ boardId: testBoard._id })
        testCard = await createTestCard({
            boardId: testBoard._id,
            columnId: testColumn._id,
            title: 'Card Before API Update'
        })
    })

    afterEach(async () => {
        await GET_DB().collection('cards').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        jest.restoreAllMocks()
        await CLOSE_DB()
    })

    // update field thường (JSON, không file)
    it('Should return 200 OK and update card title successfully', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ title: 'Card Title Updated via API' })

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.title).toBe('Card Title Updated via API')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.title).toBe('Card Title Updated via API')
    })

    // upload cardCover (multipart/form-data)
    it('Should return 200 OK and upload cover image via multipart/form-data', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .attach('cardCover', Buffer.from('fake-image-content'), 'cover.png')

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.cover).toContain('card-covers')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.cover).toContain('card-covers')
    })

    // thêm comment (JSON field lồng nhau)
    it('Should return 200 OK and add a new comment', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ commentToAdd: { content: 'Comment via API' } })

        expect(res.status).toBe(StatusCodes.OK)
        expect(res.body.comments).toHaveLength(1)
        expect(res.body.comments[0].content).toBe('Comment via API')
        expect(res.body.comments[0].userId).toBe(testUser._id.toString())

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.comments).toHaveLength(1)
    })

    // title quá ngắn (dưới 3 ký tự)
    it('Should return 422 when title is shorter than 3 characters', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}`)
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ title: 'ab' })

        expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

        // Xác nhận DB không hề bị thay đổi khi validate fail
        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.title).toBe('Card Before API Update')
    })

    // thiếu accessToken
    it('Should return 401 when access token cookie is missing', async () => {
        const res = await request
            .put(`/v1/cards/${testCard._id}`)
            .send({ title: 'New Title' })

        expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    })

    // ID KHÔNG HỢP LỆ
    it('Should return error when cardId is invalid format', async () => {
        const res = await request
            .put('/v1/cards/invalid-card-id')
            .set('Cookie', [`accessToken=${accessToken}`])
            .send({ title: 'New Title' })

        expect(res.status).toBeGreaterThanOrEqual(400)
    })

    // CARD KHÔNG TỒN TẠI
    // it('Should handle gracefully when card does not exist in DB', async () => {
    //     const fakeCardId = '6a882b81f1c8967a561e6799' // ObjectId hợp lệ nhưng không tồn tại

    //     const res = await request
    //         .put(`/v1/cards/${fakeCardId}`)
    //         .set('Cookie', [`accessToken=${accessToken}`])
    //         .send({ title: 'New Title' })

    //     // Ghi chú: hiện tại cardModel.update dùng findOneAndUpdate, MongoDB driver
    //     // sẽ trả về null nếu không tìm thấy — cần xác nhận API xử lý case này thế nào
    //     // (có thể đang trả 200 với body null, thay vì 404 - đây có thể là điểm cần cải thiện)
    //     // console.log('Response khi card không tồn tại:', res.status, res.body)
    //     expect(res.status).toBe(StatusCodes.NOT_FOUND)
    // })

    // it('Should return 404 Not Found when card does not exist', async () => {
    //     const fakeCardId = '6a882b81f1c8967a561e6799'

    //     const res = await request
    //         .put(`/v1/cards/${fakeCardId}`)
    //         .set('Cookie', [`accessToken=${accessToken}`])
    //         .send({ title: 'New Title' })

    //     expect(res.status).toBe(StatusCodes.NOT_FOUND)
    //     expect(res.body.message).toBe('Card not found!')
    // })
})