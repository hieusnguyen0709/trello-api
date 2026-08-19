import bcryptjs from 'bcryptjs'
import { GET_DB } from '~/config/mongodb'
import { userModel } from '~/models/userModel'

export const createTestUser = async (overrides = {}) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const {
        password = 'Password123!',
        isActive = true,
        ...restOverrides
    } = overrides

    const userData = {
        email: `integration-${uniqueId}@test.com`,
        password: bcryptjs.hashSync(password, 8),
        username: `integration_${uniqueId}`,
        displayName: 'Integration Test User',
        isActive,
        ...restOverrides
    }

    const createdUser = await userModel.createNew(userData)

    const user = await GET_DB()
        .collection('users')
        .findOne({ _id: createdUser.insertedId })

    return user
}