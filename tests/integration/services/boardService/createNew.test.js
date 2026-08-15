import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { boardService } from '~/services/boardService'
import { createTestUser } from '../../helpers/createTestUser'
import { BOARD_TYPES } from '~/utils/constants'

describe('boardService.createNew (integration)', () => {
    let testUser

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Should create a new board successfully', async () => {
        const boardData = {
            title: 'Test Board',
            slug: 'test-board',
            description: 'Test board description',
            type: BOARD_TYPES.PUBLIC
        }

        const createdBoard = await boardService.createNew(
            testUser._id.toString(),
            boardData
        )

        expect(createdBoard).toBeDefined()
        expect(createdBoard.title).toBe(boardData.title)
        expect(createdBoard.slug).toBe(boardData.slug)
        expect(createdBoard.description).toBe(boardData.description)
        expect(createdBoard.type).toBe(boardData.type)
        expect(createdBoard.ownerIds).toContainEqual(testUser._id)

        const boardInDatabase = await GET_DB()
            .collection('boards')
            .findOne({ _id: createdBoard._id })

        expect(boardInDatabase).toBeDefined()
        expect(boardInDatabase._id).toEqual(createdBoard._id)
        expect(boardInDatabase.ownerIds).toContainEqual(testUser._id)
    })
})