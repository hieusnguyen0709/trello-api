import { GET_DB } from '~/config/mongodb'
import { userModel } from '~/models/userModel'

export const createTestUser = async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const userData = {
        email: `integration-${uniqueId}@test.com`,
        password: '123456',
        username: `integration_${uniqueId}`,
        displayName: 'Integration Test User'
    }

    const createdUser = await userModel.createNew(userData)

    const user = await GET_DB()
        .collection('users')
        .findOne({ _id: createdUser.insertedId })

    return user
}