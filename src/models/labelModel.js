import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE
} from '~/utils/validators'

const LABEL_COLLECTION_NAME = 'labels'

const LABEL_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  title: Joi.string().required().min(1).max(30).trim().strict(),
  color: Joi.string().required().trim(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await LABEL_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  const result = await GET_DB().collection(LABEL_COLLECTION_NAME).insertOne({
    ...validData,
    boardId: new ObjectId(validData.boardId)
  })

  return await GET_DB().collection(LABEL_COLLECTION_NAME).findOne({
    _id: result.insertedId
  })
}

const findByBoardId = async (boardId) => {
  return await GET_DB().collection(LABEL_COLLECTION_NAME).find({
    boardId: new ObjectId(boardId),
    _destroy: false
  }).toArray()
}

const update = async (labelId, updateData) => {
  const result = await GET_DB().collection(LABEL_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(labelId) },
    {
      $set: {
        ...updateData,
        updatedAt: Date.now()
      }
    },
    { returnDocument: 'after' }
  )

  return result
}

const deleteOne = async (labelId) => {
  return await GET_DB()
    .collection(LABEL_COLLECTION_NAME)
    .deleteOne({ _id: new ObjectId(labelId) })
}

export const findByTitleAndColor = async (boardId, title, color) => {
  try {
    return await GET_DB()
      .collection(LABEL_COLLECTION_NAME)
      .findOne({
        boardId: new ObjectId(boardId),
        title: title,
        color: color,
        _destroy: false
      })
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (labelId) => {
  try {
    return await GET_DB().collection(LABEL_COLLECTION_NAME).findOne({ _id: new ObjectId(labelId) })
  } catch (error) {
    throw new Error(error)
  }
}

export const labelModel = {
  LABEL_COLLECTION_NAME,
  createNew,
  findByBoardId,
  update,
  deleteOne,
  findByTitleAndColor,
  findOneById
}
