import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { extractPublicId } from '~/utils/formatters'

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

    if (cardCoverFile) {
      const uploadResult = await CloudinaryProvider.streamUpload(cardCoverFile.buffer, 'card-covers')
      updatedCard = await cardModel.update(cardId, { cover: uploadResult.secure_url })
    } else if (cardAttachmentFiles?.length) {
      const uploadResults = await Promise.all(
        cardAttachmentFiles.map(cardAttachmentFile =>
          CloudinaryProvider.streamUpload(
            cardAttachmentFile.buffer,
            'card-attachments',
            { resource_type: 'raw', public_id: cardAttachmentFile.originalname }
          )
        )
      )
      const attachments = uploadResults.map(r => r.secure_url)
      updatedCard = await cardModel.pushAttachments(cardId, attachments)
    } else if (updateData.commentToAdd) {
      const commentData = {
        ...updateData.commentToAdd,
        commentedAt: Date.now(),
        userId: userInfo._id,
        userEmail: userInfo.email
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
    } else if (updateData.incomingMemberInfo) {
      // ADD or REMOVE members
      updatedCard = await cardModel.updateMembers(cardId, updateData.incomingMemberInfo)
    } else if (updateData.cardAttachmentRemove) {
      // REMOVE attachment
      const publicId = extractPublicId(updateData.cardAttachmentRemove)
      if (publicId) {
        try {
          await CloudinaryProvider.deleteFile(publicId, 'raw')
        } catch (err) {
          throw err
        }
      }

      updatedCard = await cardModel.pullAttachment(cardId, updateData.cardAttachmentRemove)
    } else if (updateData.checklistAction) {
      // ADD|UPDATE|DELETE checklist
      const { type, checklistId, data } = updateData.checklistAction

      switch (type) {
        case 'ADD':
          updatedCard = await cardModel.createChecklist(cardId, data)
          break

        case 'UPDATE':
          updatedCard = await cardModel.updateChecklist(cardId, checklistId, data)
          break

        case 'DELETE':
          updatedCard = await cardModel.deleteChecklist(cardId, checklistId)
          break

        default:
          throw new Error('Invalid checklist action')
      }
    } else {
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