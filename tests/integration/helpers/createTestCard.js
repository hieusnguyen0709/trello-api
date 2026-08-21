import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

export const createTestCard = async (customData = {}) => {
    const defaultCard = {
        boardId: new ObjectId(),
        columnId: new ObjectId(),
        title: 'Test Card Title',
        description: null,
        cover: null,
        memberIds: [],
        comments: [],
        attachments: [],
        _destroy: false,
        createdAt: Date.now(),
        updatedAt: null
    }

    // Trường hợp 1: Truyền vào 1 MẢNG để tạo nhiều Card (Dùng insertMany)
    if (Array.isArray(customData)) {
        const cardsToInsert = customData.map(item => ({ ...defaultCard, ...item }))
        const result = await GET_DB().collection('cards').insertMany(cardsToInsert)

        return cardsToInsert.map((card, index) => ({
        _id: result.insertedIds[index],
        ...card
        }))
    }

    // Trường hợp 2: Truyền vào 1 OBJECT lẻ để tạo 1 Card (Dùng insertOne)
    const cardData = { ...defaultCard, ...customData }
    const result = await GET_DB().collection('cards').insertOne(cardData)
    return { _id: result.insertedId, ...cardData }
}