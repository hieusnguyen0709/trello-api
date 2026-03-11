import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { CARD_MEMBER_ACTIONS } from '~/utils/constants'

// Define Collection (name & schema)
const CARD_COLLECTION_NAME = 'cards'
const CARD_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  title: Joi.string().required().min(3).max(50).trim().strict(),
  description: Joi.string().optional(),

  /* ================= COVER ================= */
  cover: Joi.string().default(null),

  /* ================= ATTACHMENTS ================= */
  attachments: Joi.array().items(Joi.string()).default([]),

  /* ================= LABELS ================= */
  labelIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),

  /* ================= CHECKLIST ================= */
  checklist: Joi.array().items(
    Joi.object({
      _id: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
      title: Joi.string().required().min(1).max(50).trim().strict(),
      description: Joi.string().optional(),
      position: Joi.number().integer().min(0),

      items: Joi.array().items(
        Joi.object({
          _id: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
          title: Joi.string().required().min(1).max(100).trim().strict(),
          isCompleted: Joi.boolean().default(false),
          position: Joi.number().integer().min(0),
          createdAt: Joi.date().timestamp('javascript').default(Date.now)
        })
      ).default([]),

      createdAt: Joi.date().timestamp('javascript').default(Date.now),
      updatedAt: Joi.date().timestamp('javascript').default(null)
    })
  ).default([]),

  /* ================= MEMBERS ================= */
  memberIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),

  /* ================= COMMENTS ================= */
  comments: Joi.array().items({
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userEmail: Joi.string().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    userAvatar: Joi.string(),
    userDisplayName: Joi.string(),
    content: Joi.string(),
    commentedAt: Joi.date().timestamp()
  }).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const INVALID_UPDATE_FIELDS = ['_id', 'boardId', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await CARD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false }) 
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const newCardToAdd = {
      ...validData,
      boardId: new ObjectId(validData.boardId),
      columnId: new ObjectId(validData.columnId)
    }
    const createdCard = await GET_DB().collection(CARD_COLLECTION_NAME).insertOne(newCardToAdd)
    return createdCard
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (cardId, updateData) => {
  try {
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    if (updateData.columnId) updateData.columnId = new ObjectId(updateData.columnId)

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteManyByColumnId = async (columnId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).deleteMany({ columnId: new ObjectId(columnId) })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Đây một phần từ comment vào đầu mảng comments!
 * Trong JS, ngược lại với push (thêm phần tử vào cuối mảng) sẽ là unshift (thêm phần tử vào đầu mảng)
 * Nhưng trong mongodb hiện tại chỉ có $push - mặc định đẩy phần tử vào cuối mảng.
 * Dĩ nhiên cứ lưu comment mới vào cuối cũng được, nhưng nay sẽ học cách để thêm phần tử vào đầu mảng trong mongodb.
 * Vẫn dùng $push, nhưng bọc data vào Array để trong $each và chỉ định $position: 0
 */

const unshiftNewComment = async (cardId, commentData) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { comments: { $each: [commentData], $position: 0 } } },
      { returnDocument: 'after' }
    )

    return result;
  } catch (error) {
    throw new Error(error);
  }
}

const updateMembers = async (cardId, incomingMemberInfo) => {
  try {
    // Tạo ra một biến updateCondition ban đầu là rỗng
    let updateCondition = {}

    if (incomingMemberInfo.action === CARD_MEMBER_ACTIONS.ADD) {
      // console.log('Trường hợp Add, dùng $push: ', incomingMemberInfo)
      updateCondition = { $push: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
    }

    if (incomingMemberInfo.action === CARD_MEMBER_ACTIONS.REMOVE) {
      // console.log('Trường hợp Remove, dùng $pull: ', incomingMemberInfo)
      updateCondition = { $pull: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
    }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      updateCondition, // truyền cái updateCondition ở đây
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const pushAttachments = async (cardId, attachments) => {
  try {
    const updateCondition = {
      $push: {
        attachments: {
          $each: attachments
        }
      },
      $set: {
        updatedAt: Date.now()
      }
    }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
        { _id: new ObjectId(cardId) },
        updateCondition,
        { returnDocument: 'after' }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const pullAttachment = async (cardId, attachment) => {
  try {
    const updateCondition = { $pull: { attachments: attachment } }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      updateCondition,
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const createChecklist = async (cardId, checklistData) => {
  try {
    const checklist = {
      _id: new ObjectId(),
      title: checklistData.title,
      description: checklistData.description || '',
      position: checklistData.position || 0,
      items: [],
      createdAt: Date.now(),
      updatedAt: null
    }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      {
        $push: {
          checklist: checklist
        },
        $set: {
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateChecklist = async (cardId, checklistId, checklistData) => {
  try {
    const updateFields = {}

    if (checklistData.title !== undefined) {
      updateFields['checklist.$.title'] = checklistData.title
    }

    if (checklistData.description !== undefined) {
      updateFields['checklist.$.description'] = checklistData.description
    }

    updateFields.updatedAt = Date.now()

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(cardId),
        'checklist._id': new ObjectId(checklistId)
      },
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteChecklist = async (cardId, checklistId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      {
        $pull: {
          checklist: { _id: new ObjectId(checklistId) }
        },
        $set: {
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const addChecklistItem = async (cardId, checklistId, itemData) => {
  try {
    const newItem = {
      _id: new ObjectId(),
      title: itemData.title,
      isCompleted: false,
      position: itemData.position || 0,
      createdAt: Date.now()
    }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(cardId),
        'checklist._id': new ObjectId(checklistId)
      },
      {
        $push: {
          'checklist.$.items': newItem
        },
        $set: {
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateChecklistItem = async (cardId, checklistId, itemId, updateData) => {
  try {
    // Build dynamic $set
    const updateFields = {}
    Object.keys(updateData).forEach(key => {
      updateFields[`checklist.$[cl].items.$[it].${key}`] = updateData[key]
    })

    updateFields.updatedAt = Date.now()

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      {
        $set: updateFields
      },
      {
        arrayFilters: [
          { 'cl._id': new ObjectId(checklistId) },
          { 'it._id': new ObjectId(itemId) }
        ],
        returnDocument: 'after'
      }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteChecklistItem = async (cardId, checklistId, itemId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(cardId),
        'checklist._id': new ObjectId(checklistId)
      },
      {
        $pull: {
          'checklist.$.items': { _id: new ObjectId(itemId) }
        },
        $set: {
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const pushLabelIds = async (cardId, labelId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { labelIds: new ObjectId(labelId) } },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const pullLabelIds = async (cardId, labelId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $pull: { labelIds: new ObjectId(labelId) } },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const cardModel = {
  CARD_COLLECTION_NAME,
  CARD_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  update,
  deleteManyByColumnId,
  unshiftNewComment,
  updateMembers,
  pushAttachments,
  pullAttachment,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  pushLabelIds,
  pullLabelIds
}