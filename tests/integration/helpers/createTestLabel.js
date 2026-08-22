import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

export const createTestLabel = async (customData = {}) => {
    const defaultLabel = {
        boardId: new ObjectId(),
        title: 'Test Label',
        color: '#FF0000',
        createdAt: Date.now(),
        updatedAt: null,
        _destroy: false
    }

    const labelData = { ...defaultLabel, ...customData }
    const result = await GET_DB().collection('labels').insertOne(labelData)
    return { _id: result.insertedId, ...labelData }
}