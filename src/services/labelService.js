import { labelModel } from '~/models/labelModel'
import { cardModel } from '~/models/cardModel'
import { boardModel } from '~/models/boardModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const createNew = async (reqBody) => {
  return await labelModel.createNew({
    boardId: reqBody.boardId,
    title: reqBody.title,
    color: reqBody.color
  })
}

const getByBoardId = async (boardId) => {
  return await labelModel.findByBoardId(boardId)
}

const update = async (labelId, reqBody) => {
  if (!reqBody.title && !reqBody.color) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Nothing to update')
  }

  return await labelModel.update(labelId, reqBody)
}

const deleteOne = async (labelId) => {
  return await labelModel.deleteOne(labelId)
}

export const toggle = async ({ cardId, labelId }) => {
  const card = await cardModel.findOneById(cardId)
  const hasLabel = card.labelIds.some(id => id.toString() === labelId.toString())

  return hasLabel
    ? cardModel.pullLabelIds(cardId, labelId)
    : cardModel.pushLabelIds(cardId, labelId)
}

// export const createNewLabel = async ({ boardId, cardId, title, color }) => {
//   const newLabel = await labelModel.createNew({ boardId, title, color })

//   await boardModel.pushLabelIds(boardId, newLabel._id)

//   const updatedCard = await cardModel.pushLabelIds(cardId, newLabel._id)

//   return {
//     label: newLabel,
//     card: updatedCard
//   }
// }

// export const deleteOneLabel = async ({ boardId, cardId, labelId }) => {
//   await labelModel.deleteOne(labelId)

//   await boardModel.pullLabelIds(boardId, labelId)

//   const updatedCard = await cardModel.pullLabelIds(cardId, labelId)

//   return updatedCard
// }

export const labelService = {
  createNew,
  getByBoardId,
  update,
  deleteOne,
  toggle,
  // createNewLabel,
  // deleteOneLabel
}
