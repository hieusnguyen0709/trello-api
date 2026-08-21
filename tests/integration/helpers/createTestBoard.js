import { GET_DB } from '~/config/mongodb'

export const createTestBoard = async (customData = {}) => {
    const defaultBoard = {
        title: 'Test Board Title',
        description: 'Test Board Description',
        type: 'public',
        ownerIds: [],
        memberIds: [],
        columnOrderIds: [],
        _destroy: false,
        createdAt: Date.now(),
        updatedAt: null
    }

    // Trường hợp 1: Truyền vào 1 MẢNG để tạo nhiều board (Dùng insertMany)
    if (Array.isArray(customData)) {
        const boardsToInsert = customData.map(item => ({ ...defaultBoard, ...item }))
        const result = await GET_DB().collection('boards').insertMany(boardsToInsert)

        return boardsToInsert.map((board, index) => ({
            _id: result.insertedIds[index],
            ...board
        }))
    }

    // Trường hợp 2: Truyền vào 1 OBJECT lẻ để tạo 1 board (Dùng insertOne)
    const boardData = { ...defaultBoard, ...customData }
    const result = await GET_DB().collection('boards').insertOne(boardData)
    return { _id: result.insertedId, ...boardData }
}