import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

export const createTestColumn = async (customData = {}) => {
    const defaultColumn = {
        boardId: new ObjectId(),
        title: 'Test Column',
        cardOrderIds: [],
        _destroy: false,
        createdAt: Date.now(),
        updatedAt: null
    }

    // Trường hợp 1: Truyền vào 1 MẢNG để tạo nhiều column (Dùng insertMany)
    if (Array.isArray(customData)) {
        const columnsToInsert = customData.map(item => ({ ...defaultColumn, ...item }))
        const result = await GET_DB().collection('columns').insertMany(columnsToInsert)

        return columnsToInsert.map((column, index) => ({
            _id: result.insertedIds[index],
            ...column
        }))
    }

    // Trường hợp 2: Truyền vào 1 OBJECT lẻ để tạo 1 column (Dùng insertOne)
    const columnData = { ...defaultColumn, ...customData }
    const result = await GET_DB().collection('columns').insertOne(columnData)
    return { _id: result.insertedId, ...columnData }
}