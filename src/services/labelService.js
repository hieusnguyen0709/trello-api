import { labelModel } from '~/models/labelModel'
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

export const labelService = {
  createNew,
  getByBoardId,
  update,
  deleteOne
}
