import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { extractPublicId } from '~/utils/formatters'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const createNew = async (reqBody) => {
  try {
    const newCard = {
      ...reqBody
    }
    const createdCard = await cardModel.createNew(newCard)
    const getNewCard = await cardModel.findOneById(createdCard.insertedId)

    if (getNewCard) {
      await columnModel.pushCardOrderIds(getNewCard)
    }

    return getNewCard
  } catch (error) {
    throw error
  }
}

const update = async (cardId, reqBody, cardCoverFile, cardAttachmentFiles, userInfo) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }

    let updatedCard = {}

    if (cardCoverFile) { // COVER //
      const uploadResult = await CloudinaryProvider.streamUpload(cardCoverFile.buffer, 'card-covers')
      updatedCard = await cardModel.update(cardId, { cover: uploadResult.secure_url })
    } else if (cardAttachmentFiles?.length) { // ADD ATTACHMENT //
      const uploadResults = await Promise.all(
        cardAttachmentFiles.map(cardAttachmentFile =>
          CloudinaryProvider.streamUpload(
            cardAttachmentFile.buffer,
            'card-attachments',
            { resource_type: 'raw', type: 'upload', public_id: cardAttachmentFile.originalname }
          )
        )
      )
      const attachments = uploadResults.map(r => r.secure_url)
      updatedCard = await cardModel.pushAttachments(cardId, attachments)
    } else if (updateData.commentToAdd) { // COMMENT //
      const commentData = {
        ...updateData.commentToAdd,
        commentedAt: Date.now(),
        userId: userInfo._id,
        userEmail: userInfo.email
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
    } else if (updateData.incomingMemberInfo) { // MEMBER //
      updatedCard = await cardModel.updateMembers(cardId, updateData.incomingMemberInfo)
    } else if (updateData.cardAttachmentRemove) { // REMOVE ATTACHMENT //
      const publicId = extractPublicId(updateData.cardAttachmentRemove)
      if (!publicId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid attachment URL, cannot determine publicId')
      }
      await CloudinaryProvider.deleteFile(publicId, 'raw')
      updatedCard = await cardModel.pullAttachment(cardId, updateData.cardAttachmentRemove)
    } else if (updateData.checklistAction) { // CHECKLIST //
      const { type, checklistId, itemId, data } = updateData.checklistAction

      switch (type) {
        // ===== CHECKLIST =====
        case 'ADD':
          updatedCard = await cardModel.createChecklist(cardId, data)
          break

        case 'UPDATE':
          updatedCard = await cardModel.updateChecklist(cardId, checklistId, data)
          break

        case 'DELETE':
          updatedCard = await cardModel.deleteChecklist(cardId, checklistId)
          break

        // ===== CHECKLIST ITEM =====
        case 'ITEM_ADD':
          updatedCard = await cardModel.addChecklistItem(cardId, checklistId, data)
          break

        case 'ITEM_UPDATE':
          updatedCard = await cardModel.updateChecklistItem(cardId, checklistId, itemId, data)
          break

        case 'ITEM_DELETE':
          updatedCard = await cardModel.deleteChecklistItem(cardId, checklistId, itemId)
          break

        default:
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid checklist action')
      }
    } else if (updateData.labelAction) {
      const { type, labelId } = updateData.labelAction

      switch (type) {
        case 'ADD':
          updatedCard = await cardModel.pushLabelIds(cardId, labelId)
          break

        case 'DELETE':
          updatedCard = await cardModel.pullLabelIds(cardId, labelId)
          break

        default:
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid label action')
      }
    }
    else {
      // Update all
      updatedCard = await cardModel.update(cardId, updateData)
    }

    return updatedCard
  } catch (error) {
    throw error
  }
}

export const cardService = {
  createNew,
  update
}