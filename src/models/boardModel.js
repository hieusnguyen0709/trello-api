import Joi from 'joi'
import { ObjectId, ReturnDocument } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { BOARD_TYPES } from '~/utils/constants'
import { columnModel } from '~/models/columnModel'
import { cardModel } from '~/models/cardModel'
import { userModel } from '~/models/userModel'
import { pagingSkipValue } from '~/utils/algorithms'

// Define Collection (Name & Schema)
const BOARD_COLLECTION_NAME = 'boards'
const BOARD_COLLECTION_SCHEMA = Joi.object({
    title: Joi.string().required().min(3).max(50).trim().strict(),
    slug: Joi.string().required().min(3).trim().strict(),
    description: Joi.string().required().min(3).max(255).trim().strict(),
    type: Joi.string().valid(BOARD_TYPES.PUBLIC, BOARD_TYPES.PRIVATE).required(),

    // Lưu ý các item trong mảng columnOrderIds là ObjectId nên cần thêm pattern cho chuẩn
    columnOrderIds: Joi.array().items(
        Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ).default([]),

    ownerIds: Joi.array().items(
        Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ).default([]),

    memberIds: Joi.array().items(
        Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ).default([]),

    createdAt: Joi.date().timestamp('javascript').default(Date.now),
    updatedAt: Joi.date().timestamp('javascript').default(null),
    _destroy: Joi.boolean().default(false)
})

const INVALID_UPDATE_FIELDS = ['_id', 'createdAt']

const validateBeforeCreate = async (data) => {
    return await BOARD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false }) 
}

const createNew = async (userId, data) => {
    try {
        const validData = await validateBeforeCreate(data)
        const newBoardToAdd = {
            ...validData,
            ownerIds: [new ObjectId(userId)]
        }
        const createdBoard = await GET_DB().collection(BOARD_COLLECTION_NAME).insertOne(newBoardToAdd)
        return createdBoard
    } catch (error) {
        throw new Error(error)
    }
}

const findOneById = async (id) => {
    try {
        const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
        return result
    } catch (error) {
        throw new Error(error)
    }
}

// Query tổng hợp (aggregate) để lấy toàn bộ Columns và Cards thuộc về Board
const getDetails = async (userId, boardId) => {
    try {
        // const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
        const queryConditions = [
            { _id: new ObjectId(boardId) },
            { _destroy: false },
            { $or: [
                { ownerIds: { $all: [new ObjectId(userId)] } },
                { memberIds: { $all: [new ObjectId(userId)] } }
            ] }
        ]

        const result = await GET_DB().collection(BOARD_COLLECTION_NAME).aggregate([
            { $match: { $and: queryConditions } },
            { $lookup: {
                from: columnModel.COLUMN_COLLECTION_NAME,
                localField: '_id',
                foreignField: 'boardId',
                as: 'columns'
            } },
            { $lookup: {
                from: cardModel.CARD_COLLECTION_NAME,
                localField: '_id',
                foreignField: 'boardId',
                as: 'cards'
            } },
            { $lookup: {
                from: userModel.USER_COLLECTION_NAME,
                localField: 'ownerIds',
                foreignField: '_id',
                as: 'owners',
                // pipeline trong lookup là để xử lý một hoặc nhiều luồng cần thiết
                // $project để chỉ định vài field không muốn lấy về bằng cách gán giá trị nó bằng 0
                pipeline: [{ $project: { 'password': 0, 'verifyToken': 0 } }]
            } },
            { $lookup: {
                from: userModel.USER_COLLECTION_NAME,
                localField: 'memberIds',
                foreignField: '_id',
                as: 'members',
                pipeline: [{ $project: { 'password': 0, 'verifyToken': 0 } }]
            } }
        ]).toArray()
        return result[0] || null
    } catch (error) {
        throw new Error(error)
    }
}

const pushColumnOrderIds = async (column) => {
    try {
        const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
            { _id: new ObjectId(column.boardId) },
            { $push: { columnOrderIds: new ObjectId(column._id) } },
            { returnDocument: 'after' }
        )

        return result
    } catch (error) {
        throw new Error(error)
    }
}

const pullColumnOrderIds = async (column) => {
    try {
        const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
            { _id: new ObjectId(column.boardId) },
            { $pull: { columnOrderIds: new ObjectId(column._id) } },
            { returnDocument: 'after' }
        )

        return result
    } catch (error) {
        throw new Error(error)
    }
}

const update = async (boardId, updateData) => {
    try {
        Object.keys(updateData).forEach(fieldName => {
            if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
                delete updateData[fieldName]
            }
        })

        if (updateData.columnOrderIds) {
            updateData.columnOrderIds = updateData.columnOrderIds.map(_id => (new ObjectId(_id)))
        }

        const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
            { _id: new ObjectId(boardId) },
            { $set: updateData },
            { returnDocument: 'after' }
        )

        return result
    } catch (error) {
        throw new Error(error)
    }
}

const getBoards = async (userId, page, itemsPerPage, queryFilters) => {
    try {
       const queryConditions = [
        // 1. Chưa bị xóa
        { _destroy: false },
        // 2. userId phải thuộc 1 trong 2 mảng ownerIds hoặc memberIds
        { $or: [
            { ownerIds: { $all: [new ObjectId(userId)] } },
            { memberIds: { $all: [new ObjectId(userId)] } }
        ] }
       ]

       // Xử lý query filter cho từng trường hợp search board
       if (queryFilters) {
        Object.keys(queryFilters).forEach(key => {
            // queryFilters[key] ví dụ queryFilters[title] nếu phía FE đẩy lên q[title]
            // Phân biệt chữ hoa - chữ thường
            // queryConditions.push({ [key]: { $regex: queryFilters[key] } })

            // Không phân biệt chữ hoa - chữ thường
            queryConditions.push({ [key]: { $regex: new RegExp(queryFilters[key], 'i') } })
        })
       }

       const query = await GET_DB().collection(BOARD_COLLECTION_NAME).aggregate(
            [
                { $match: { $and: queryConditions } },
                // Sort title của board theo A-Z (mặc định sẽ bị chữ B hoa đứng trước chữ a thường theo chuẩn bảng mã ASCII)
                { $sort: { title: 1 } },
                // $facet để xử lý nhiều luồng trong một query
                { $facet: {
                    'queryBoards': [
                        { $skip: pagingSkipValue(page, itemsPerPage) }, // Bỏ qua số lượng bản ghi của những page trước đó
                        { $limit: itemsPerPage } // Giới hạn tối đa số lượng bản ghi trả về trên một page
                    ],
                    'queryTotalBoards': [{ $count: 'countedAllBoards' }]
                } }
            ],
            // Khai báo thêm thuộc tính collation locale 'en' để fix vụ chữ B hoa và a thường ở trên
            { collation: { locale: 'en' } }
        ).toArray()
        // console.log('query: ', query)

        const res = query[0]

        return {
            boards: res.queryBoards || [],
            totalBoards: res.queryTotalBoards[0]?.countedAllBoards || 0
        }

    } catch (error) {
        throw new Error(error)
    }
}

const pushMemberIds = async (boardId, userId) => {
    try {
        const result = await GET_DB().collection(BOARD_COLLECTION_NAME).findOneAndUpdate(
            { _id: new ObjectId(boardId) },
            { $push: { memberIds: new ObjectId(userId) } },
            { returnDocument: 'after' }
        )

        return result
    } catch (error) {
        throw new Error(error)
    }
}

export const boardModel = {
    BOARD_COLLECTION_NAME,
    BOARD_COLLECTION_SCHEMA,
    createNew,
    findOneById,
    getDetails,
    pushColumnOrderIds,
    pullColumnOrderIds,
    update,
    getBoards,
    pushMemberIds
}