import { cardService } from '~/services/cardService'
import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

jest.mock('~/config/mongodb')
jest.mock('~/models/cardModel')
jest.mock('~/models/columnModel')
jest.mock('~/providers/CloudinaryProvider')

describe('cardService.createNew', () => {
    it('Create a card and push its ID into the parent column order', async () => {
        cardModel.createNew.mockResolvedValue({ insertedId: 'card1' })
        cardModel.findOneById.mockResolvedValue({ _id: 'card1', columnId: 'col1', title: 'New Card' })
        columnModel.pushCardOrderIds.mockResolvedValue({})

        const result = await cardService.createNew({ columnId: 'col1', title: 'New Card' })

        expect(columnModel.pushCardOrderIds).toHaveBeenCalledWith({
            _id: 'card1',
            columnId: 'col1',
            title: 'New Card'
        })
        expect(result._id).toBe('card1')
    })

    it('Not call columnModel.pushCardOrderIds when the newly created card cannot be found', async () => {
        cardModel.createNew.mockResolvedValue({ insertedId: 'card1' })
        cardModel.findOneById.mockResolvedValue(null)

        const result = await cardService.createNew({ columnId: 'col1', title: 'New Card' })

        expect(columnModel.pushCardOrderIds).not.toHaveBeenCalled()
        expect(result).toBeNull()
    })
})

describe('cardService.update', () => {
    describe('when updating the card cover', () => {
        it('Upload the cover file to Cloudinary and update the card with the returned URL', async () => {
            const CLOUDINARY_MOCK_URL = 'https://res.cloudinary.com/demo/image/upload/card-covers/abc123.jpg'

            CloudinaryProvider.streamUpload.mockResolvedValue({ secure_url: CLOUDINARY_MOCK_URL })
            cardModel.update.mockResolvedValue({ _id: 'card1', cover: CLOUDINARY_MOCK_URL })

            const cardCoverFile = { buffer: Buffer.from('fake-image-data') }

            const result = await cardService.update('card1', {}, cardCoverFile, null, null)

            expect(CloudinaryProvider.streamUpload).toHaveBeenCalledWith(cardCoverFile.buffer, 'card-covers')
            expect(cardModel.update).toHaveBeenCalledWith('card1', { cover: CLOUDINARY_MOCK_URL })
            expect(result.cover).toBe(CLOUDINARY_MOCK_URL)
        })
    })

    describe('when adding attachment files', () => {
        it('Upload each attachment file to Cloudinary with its own originalname as public_id', async () => {
            const files = [
                { buffer: Buffer.from('file1'), originalname: 'document1.pdf' },
                { buffer: Buffer.from('file2'), originalname: 'document2.pdf' }
            ]

            CloudinaryProvider.streamUpload
            .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/document1.pdf' })
            .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/document2.pdf' })

            cardModel.pushAttachments.mockResolvedValue({ _id: 'card1', attachments: [] })

            await cardService.update('card1', {}, null, files, null)

            expect(CloudinaryProvider.streamUpload).toHaveBeenNthCalledWith(
                1, files[0].buffer, 'card-attachments', { resource_type: 'raw', type: 'upload', access_mode: 'upload', public_id: 'document1.pdf' }
            )
            expect(CloudinaryProvider.streamUpload).toHaveBeenNthCalledWith(
                2, files[1].buffer, 'card-attachments', { resource_type: 'raw', type: 'upload', access_mode: 'upload', public_id: 'document2.pdf' }
            )
        })

        it('Push the array of uploaded secure URLs to cardModel.pushAttachments in the correct order', async () => {
            const files = [
                { buffer: Buffer.from('file1'), originalname: 'document1.pdf' },
                { buffer: Buffer.from('file2'), originalname: 'document2.pdf' }
            ]

            CloudinaryProvider.streamUpload
            .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/document1.pdf' })
            .mockResolvedValueOnce({ secure_url: 'https://cloudinary.com/document2.pdf' })

            cardModel.pushAttachments.mockResolvedValue({ _id: 'card1' })

            await cardService.update('card1', {}, null, files, null)

            expect(cardModel.pushAttachments).toHaveBeenCalledWith('card1', [
                'https://cloudinary.com/document1.pdf',
                'https://cloudinary.com/document2.pdf'
            ])
        })

        it('Not trigger this branch when cardAttachmentFiles is an empty array', async () => {
            cardModel.update.mockResolvedValue({ _id: 'card1' })

            await cardService.update('card1', { title: 'New Title' }, null, [], null)

            expect(CloudinaryProvider.streamUpload).not.toHaveBeenCalled()
            expect(cardModel.pushAttachments).not.toHaveBeenCalled()
            expect(cardModel.update).toHaveBeenCalled()
        })
    })

    describe('when adding a comment', () => {
        const FIXED_TIMESTAMP = 1700000000000

        beforeEach(() => {
            jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP)
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('Merge the comment content with a server-generated timestamp and the authenticated userInfo', async () => {
            cardModel.unshiftNewComment.mockResolvedValue({ _id: 'card1', comments: [] })

            const reqBody = { commentToAdd: { content: 'Great card!' } }
            const userInfo = { _id: 'user1', email: 'user1@test.com' }

            await cardService.update('card1', reqBody, null, null, userInfo)

            expect(cardModel.unshiftNewComment).toHaveBeenCalledWith('card1', {
                content: 'Great card!',
                commentedAt: FIXED_TIMESTAMP,
                userId: 'user1',
                userEmail: 'user1@test.com'
            })
        })

        it('Use userId and userEmail from the authenticated userInfo, not from client-submitted data', async () => {
            cardModel.unshiftNewComment.mockResolvedValue({ _id: 'card1' })

            const reqBody = {
                commentToAdd: {
                    content: 'Fake comment',
                    userId: 'fake-user-id',
                    userEmail: 'fake-user@test.com'
                }
            }
            const userInfo = { _id: 'real-user-id', email: 'real-user@test.com' }

            await cardService.update('card1', reqBody, null, null, userInfo)

            expect(cardModel.unshiftNewComment).toHaveBeenCalledWith('card1', expect.objectContaining({
                userId: 'real-user-id',
                userEmail: 'real-user@test.com'
            }))
        })
    })

    describe('when updating card members', () => {
        it('Forward incomingMemberInfo to cardModel.updateMembers', async () => {
            cardModel.updateMembers.mockResolvedValue({ _id: 'card1', memberIds: ['user1'] })

            const incomingMemberInfo = { userId: 'user1', action: 'ADD' }
            const reqBody = { incomingMemberInfo }

            const result = await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.updateMembers).toHaveBeenCalledWith('card1', incomingMemberInfo)
            expect(result.memberIds).toEqual(['user1'])
        })
    })

    describe('when removing an attachment', () => {
        const VALID_CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v123/trello/attachment123.pdf'
        const URL_WITHOUT_UPLOAD_PATH = 'https://res.cloudinary.com/demo/image/trello/attachment123.pdf'

        it('Delete the file from Cloudinary using the extracted publicId, then pull the attachment using the original URL', async () => {
            CloudinaryProvider.deleteFile.mockResolvedValue({})
            cardModel.pullAttachment.mockResolvedValue({ _id: 'card1', attachments: [] })

            const reqBody = { cardAttachmentRemove: VALID_CLOUDINARY_URL }

            await cardService.update('card1', reqBody, null, null, null)

            expect(CloudinaryProvider.deleteFile).toHaveBeenCalledWith('trello/attachment123.pdf', 'raw')
            expect(cardModel.pullAttachment).toHaveBeenCalledWith('card1', VALID_CLOUDINARY_URL)
        })

        it('Throw a 400 ApiError when the URL does not yield a valid publicId, without touching the DB', async () => {
            const reqBody = { cardAttachmentRemove: URL_WITHOUT_UPLOAD_PATH }

            await expect(
                cardService.update('card1', reqBody, null, null, null)
            ).rejects.toThrow('Invalid attachment URL, cannot determine publicId')

            expect(CloudinaryProvider.deleteFile).not.toHaveBeenCalled()
            expect(cardModel.pullAttachment).not.toHaveBeenCalled()
        })

        it('Propagate the error and not call pullAttachment when Cloudinary deleteFile fails', async () => {
            CloudinaryProvider.deleteFile.mockRejectedValue(new Error('Cloudinary deletion failed'))

            const reqBody = { cardAttachmentRemove: VALID_CLOUDINARY_URL }

            await expect(
                cardService.update('card1', reqBody, null, null, null)
            ).rejects.toThrow('Cloudinary deletion failed')

            expect(cardModel.pullAttachment).not.toHaveBeenCalled()
        })
    })

    describe('when performing a checklist action', () => {
        it('Create a new checklist when type is ADD', async () => {
            cardModel.createChecklist.mockResolvedValue({ _id: 'card1', checklists: [] })

            const reqBody = { checklistAction: { type: 'ADD', data: { title: 'Todo list' } } }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.createChecklist).toHaveBeenCalledWith('card1', { title: 'Todo list' })
        })

        it('Update an existing checklist when type is UPDATE', async () => {
            cardModel.updateChecklist.mockResolvedValue({ _id: 'card1' })

            const reqBody = {
                checklistAction: { type: 'UPDATE', checklistId: 'checklist1', data: { title: 'Renamed' } }
            }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.updateChecklist).toHaveBeenCalledWith('card1', 'checklist1', { title: 'Renamed' })
        })

        it('Delete a checklist when type is DELETE', async () => {
            cardModel.deleteChecklist.mockResolvedValue({ _id: 'card1' })

            const reqBody = { checklistAction: { type: 'DELETE', checklistId: 'checklist1' } }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.deleteChecklist).toHaveBeenCalledWith('card1', 'checklist1')
        })

        it('Add a new item to a checklist when type is ITEM_ADD', async () => {
            cardModel.addChecklistItem.mockResolvedValue({ _id: 'card1' })

            const reqBody = {
                checklistAction: { type: 'ITEM_ADD', checklistId: 'checklist1', data: { text: 'Buy milk' } }
            }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.addChecklistItem).toHaveBeenCalledWith('card1', 'checklist1', { text: 'Buy milk' })
        })

        it('Update a checklist item when type is ITEM_UPDATE', async () => {
            cardModel.updateChecklistItem.mockResolvedValue({ _id: 'card1' })

            const reqBody = {
                checklistAction: {
                    type: 'ITEM_UPDATE',
                    checklistId: 'checklist1',
                    itemId: 'item1',
                    data: { done: true }
                }
            }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.updateChecklistItem).toHaveBeenCalledWith('card1', 'checklist1', 'item1', { done: true })
        })

        it('Delete a checklist item when type is ITEM_DELETE', async () => {
            cardModel.deleteChecklistItem.mockResolvedValue({ _id: 'card1' })

            const reqBody = {
                checklistAction: { type: 'ITEM_DELETE', checklistId: 'checklist1', itemId: 'item1' }
            }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.deleteChecklistItem).toHaveBeenCalledWith('card1', 'checklist1', 'item1')
        })

        it('Throw a 400 ApiError when the checklist action type is invalid', async () => {
            const reqBody = { checklistAction: { type: 'UNKNOWN_TYPE' } }

            await expect(
                cardService.update('card1', reqBody, null, null, null)
            ).rejects.toThrow('Invalid checklist action')
        })
    })

    describe('when performing a label action', () => {
        it('Push a labelId to the card when type is ADD', async () => {
            cardModel.pushLabelIds.mockResolvedValue({ _id: 'card1', labelIds: ['label1'] })

            const reqBody = { labelAction: { type: 'ADD', labelId: 'label1' } }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.pushLabelIds).toHaveBeenCalledWith('card1', 'label1')
        })

        it('Pull a labelId from the card when type is DELETE', async () => {
            cardModel.pullLabelIds.mockResolvedValue({ _id: 'card1', labelIds: [] })

            const reqBody = { labelAction: { type: 'DELETE', labelId: 'label1' } }

            await cardService.update('card1', reqBody, null, null, null)

            expect(cardModel.pullLabelIds).toHaveBeenCalledWith('card1', 'label1')
        })

        it('Throw a 400 ApiError when the label action type is invalid', async () => {
            const reqBody = { labelAction: { type: 'UNKNOWN_TYPE', labelId: 'label1' } }

            await expect(
                cardService.update('card1', reqBody, null, null, null)
            ).rejects.toThrow('Invalid label action')
        })
    })

    describe('when no special field is provided (default update)', () => {
        const FIXED_TIMESTAMP = 1700000000000

        beforeEach(() => {
            jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP)
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('Add an updatedAt timestamp and forward all reqBody fields to cardModel.update', async () => {
            cardModel.update.mockResolvedValue({ _id: 'card1', title: 'New Title', updatedAt: FIXED_TIMESTAMP })

            const result = await cardService.update('card1', { title: 'New Title' }, null, null, null)

            expect(cardModel.update).toHaveBeenCalledWith('card1', {
                title: 'New Title',
                updatedAt: FIXED_TIMESTAMP
            })
            expect(result.updatedAt).toBe(FIXED_TIMESTAMP)
        })
    })
})