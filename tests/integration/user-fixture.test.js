import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { createTestUser } from './helpers/createTestUser'
import { createTestToken } from './helpers/createTestToken'

describe('Test user fixture', () => {
    beforeAll(async () => {
        await CONNECT_DB()
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should create a user and generate access token', async () => {
        const user = await createTestUser()
        const accessToken = await createTestToken(user)

        expect(user).toBeDefined()
        expect(user._id).toBeDefined()

        expect(accessToken).toBeDefined()
        expect(typeof accessToken).toBe('string')
    })
})