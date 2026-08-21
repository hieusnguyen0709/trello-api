import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { cardService } from '~/services/cardService'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { ObjectId } from 'mongodb'

describe('cardService.update - Full Integration Test with DB Assertion', () => {
    let testUser
    let fakeUserInfo
    let testBoard
    let testColumn
    let testCard

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
        fakeUserInfo = { _id: testUser._id.toString(), email: testUser.email }

        jest.spyOn(CloudinaryProvider, 'streamUpload').mockImplementation(async (buffer, folder) => ({
            secure_url: `https://res.cloudinary.com/test/${folder}/mock-file.png`
        }))
        jest.spyOn(CloudinaryProvider, 'deleteFile').mockImplementation(async () => ({ result: 'ok' }))
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({ ownerIds: [testUser._id] })
        testColumn = await createTestColumn({ boardId: testBoard._id })
        testCard = await createTestCard({
            boardId: testBoard._id,
            columnId: testColumn._id,
            title: 'Card Base Title'
        })
    })

    afterEach(async () => {
        // Dọn theo từng test, tránh dữ liệu chồng chéo giữa các case
        await GET_DB().collection('cards').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await GET_DB().collection('users').deleteOne({ _id: testUser._id })
        jest.restoreAllMocks()
        await CLOSE_DB()
    })

    // UPDATE ALL (mặc định, không field đặc biệt)
    it('Update plain fields (title) when no special field is present', async () => {
        const result = await cardService.update(
            testCard._id.toString(),
            { title: 'New Title' },
            null, [], fakeUserInfo
        )

        expect(result.title).toBe('New Title')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.title).toBe('New Title')
    })

    // NHÁNH: COVER
    it('Upload cover image and updates the cover field', async () => {
        const fakeFile = { buffer: Buffer.from('fake-image'), originalname: 'cover.png' }

        const result = await cardService.update(
            testCard._id.toString(),
            {},
            fakeFile, [], fakeUserInfo
        )

        expect(result.cover).toContain('card-covers')
        expect(CloudinaryProvider.streamUpload).toHaveBeenCalledWith(fakeFile.buffer, 'card-covers')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.cover).toContain('card-covers')
    })

    // NHÁNH: ATTACHMENT ADD
    it('Upload attachment files and pushes them into attachments array', async () => {
        const fakeFile = { buffer: Buffer.from('fake-doc'), originalname: 'doc.pdf' }

        const result = await cardService.update(
            testCard._id.toString(),
            {},
            null, [fakeFile], fakeUserInfo
        )

        expect(result.attachments).toHaveLength(1)
        expect(result.attachments[0]).toContain('card-attachments')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.attachments).toHaveLength(1)
    })

    // NHÁNH: COMMENT
    it('Unshift a new comment to the beginning of the comments array', async () => {
        const commentToAdd = { content: 'This is a test comment' }

        const result = await cardService.update(
            testCard._id.toString(),
            { commentToAdd },
            null, [], fakeUserInfo
        )

        expect(result.comments).toHaveLength(1)
        expect(result.comments[0].content).toBe('This is a test comment')
        expect(result.comments[0].userId).toBe(testUser._id.toString())

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.comments[0].content).toBe('This is a test comment')
    })

    // NHÁNH: MEMBER ADD
    it('Add a member to memberIds when action is ADD', async () => {
        const incomingMemberInfo = { userId: testUser._id.toString(), action: 'ADD' }

        const result = await cardService.update(
            testCard._id.toString(),
            { incomingMemberInfo },
            null, [], fakeUserInfo
        )

        expect(result.memberIds.map(String)).toContain(testUser._id.toString())

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.memberIds.map(String)).toContain(testUser._id.toString())
    })

    // NHÁNH: MEMBER REMOVE
    it('Remove a member from memberIds when action is REMOVE', async () => {
        // Seed sẵn member trước khi test remove
        await GET_DB().collection('cards').updateOne(
            { _id: testCard._id },
            { $push: { memberIds: testUser._id } }
        )
        const incomingMemberInfo = { userId: testUser._id.toString(), action: 'REMOVE' }

        const result = await cardService.update(
            testCard._id.toString(),
            { incomingMemberInfo },
            null, [], fakeUserInfo
        )

        expect(result.memberIds.map(String)).not.toContain(testUser._id.toString())

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.memberIds).toHaveLength(0)
    })

    // NHÁNH: ATTACHMENT REMOVE
    it('Remove an attachment and calls Cloudinary deleteFile', async () => {
        const attachmentUrl = 'https://res.cloudinary.com/test-cloud/raw/upload/v1234567890/card-attachments/existing-file'
        await GET_DB().collection('cards').updateOne(
            { _id: testCard._id },
            { $push: { attachments: attachmentUrl } }
        )

        const result = await cardService.update(
            testCard._id.toString(),
            { cardAttachmentRemove: attachmentUrl },
            null, [], fakeUserInfo
        )

        expect(result.attachments).not.toContain(attachmentUrl)
        expect(CloudinaryProvider.deleteFile).toHaveBeenCalled()

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.attachments).toHaveLength(0)
    })

    // CHECKLIST ADD
    it('Create a new checklist and pushes it into the checklist array', async () => {
        const checklistAction = { type: 'ADD', data: { title: 'To-do list', position: 0 } }

        const result = await cardService.update(
            testCard._id.toString(),
            { checklistAction },
            null, [], fakeUserInfo
        )

        expect(result.checklist).toHaveLength(1)
        expect(result.checklist[0].title).toBe('To-do list')

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.checklist).toHaveLength(1)
    })

    // LABEL ADD
    it('Add a labelId to labelIds when labelAction type is ADD', async () => {
        const fakeLabelId = new ObjectId().toString()
        const labelAction = { type: 'ADD', labelId: fakeLabelId }

        const result = await cardService.update(
            testCard._id.toString(),
            { labelAction },
            null, [], fakeUserInfo
        )

        expect(result.labelIds.map(String)).toContain(fakeLabelId)

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.labelIds.map(String)).toContain(fakeLabelId)
    })

    // checklistAction.type không hợp lệ
    it('Throw ApiError 400 when checklistAction type is invalid', async () => {
        const checklistAction = { type: 'INVALID_TYPE' }

        await expect(
            cardService.update(testCard._id.toString(), { checklistAction }, null, [], testUser)
        ).rejects.toThrow('Invalid checklist action')

        // Xác nhận DB không hề bị thay đổi khi action không hợp lệ
        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.checklist).toHaveLength(0)
    })

    // cardAttachmentRemove với URL không hợp lệ
    it('Throws ApiError 400 when attachment URL cannot be parsed for publicId', async () => {
        await expect(
            cardService.update(
                testCard._id.toString(),
                { cardAttachmentRemove: 'not-a-valid-cloudinary-url' },
                null, [], fakeUserInfo
            )
        ).rejects.toThrow('Invalid attachment URL')
    })
})