import { boardService } from '~/services/boardService'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { ObjectId } from 'mongodb'

describe('Integration: boardService.update', () => {
    let testUser
    let boardId

    beforeAll(async () => {
        await CONNECT_DB()
        testUser = await createTestUser()

        const board = await createTestBoard({
            title: 'Board Test Update',
            ownerIds: [testUser._id]
        })
        boardId = board._id
    })

    afterAll(async () => {
        if (boardId) {
            await GET_DB().collection('boards').deleteOne({ _id: boardId })
        }

        if (testUser) {
            await GET_DB().collection('users').deleteOne({
                _id: testUser._id
            })
        }

        await CLOSE_DB()
    })

    it('Should update board successfully and save changes to database', async () => {
        const updateData = {
            title: 'Updated Board Title',
            description: 'Updated board description',
            type: 'private'
        }

        const updatedBoard = await boardService.update(
            boardId.toString(),
            updateData
        )

        expect(updatedBoard).toBeDefined()
        expect(updatedBoard.title).toBe(updateData.title)
        expect(updatedBoard.description).toBe(updateData.description)
        expect(updatedBoard.type).toBe(updateData.type)

        const boardInDb = await GET_DB()
            .collection('boards')
            .findOne({ _id: boardId })

        expect(boardInDb.title).toBe(updateData.title)
        expect(boardInDb.description).toBe(updateData.description)
        expect(boardInDb.type).toBe(updateData.type)
    })

    it('Should update updatedAt when board is updated', async () => {
        const beforeUpdate = Date.now()

        const updatedBoard = await boardService.update(
            boardId.toString(),
            {
                title: 'Board Updated Again'
            }
        )

        const afterUpdate = Date.now()

        expect(updatedBoard.updatedAt).toBeGreaterThanOrEqual(beforeUpdate)
        expect(updatedBoard.updatedAt).toBeLessThanOrEqual(afterUpdate)
    })

    it('Should not update _id field', async () => {
        const originalId = boardId

        await boardService.update(
            boardId.toString(),
            {
                _id: new ObjectId().toString(),
                title: 'Updated Without Changing ID'
            }
        )

        const boardInDb = await GET_DB()
            .collection('boards')
            .findOne({ _id: originalId })

        expect(boardInDb._id.toString()).toBe(originalId.toString())
        expect(boardInDb.title).toBe('Updated Without Changing ID')
    })

    it('Should not update createdAt field', async () => {
        const boardBeforeUpdate = await GET_DB()
            .collection('boards')
            .findOne({ _id: boardId })

        const originalCreatedAt = boardBeforeUpdate.createdAt

        await boardService.update(
            boardId.toString(),
            {
                createdAt: Date.now() + 999999999,
                title: 'Updated CreatedAt Test'
            }
        )

        const boardInDb = await GET_DB()
            .collection('boards')
            .findOne({ _id: boardId })

        expect(boardInDb.createdAt).toBe(originalCreatedAt)
    })

    it('Should convert columnOrderIds from string to ObjectId', async () => {
        const columnId1 = new ObjectId()
        const columnId2 = new ObjectId()

        await boardService.update(
            boardId.toString(),
            {
                columnOrderIds: [
                    columnId1.toString(),
                    columnId2.toString()
                ]
            }
        )

        const boardInDb = await GET_DB()
            .collection('boards')
            .findOne({ _id: boardId })

        expect(boardInDb.columnOrderIds).toHaveLength(2)

        expect(boardInDb.columnOrderIds[0]).toBeInstanceOf(ObjectId)
        expect(boardInDb.columnOrderIds[1]).toBeInstanceOf(ObjectId)

        expect(boardInDb.columnOrderIds[0].toString())
            .toBe(columnId1.toString())

        expect(boardInDb.columnOrderIds[1].toString())
            .toBe(columnId2.toString())
    })

    it('Should convert labelIds from string to ObjectId', async () => {
        const labelId1 = new ObjectId()
        const labelId2 = new ObjectId()

        await boardService.update(
            boardId.toString(),
            {
                labelIds: [
                    labelId1.toString(),
                    labelId2.toString()
                ]
            }
        )

        const boardInDb = await GET_DB()
            .collection('boards')
            .findOne({ _id: boardId })

        expect(boardInDb.labelIds).toHaveLength(2)

        expect(boardInDb.labelIds[0]).toBeInstanceOf(ObjectId)
        expect(boardInDb.labelIds[1]).toBeInstanceOf(ObjectId)
    })

    it('Should return null when board does not exist', async () => {
        const nonExistentBoardId = new ObjectId().toString()

        const result = await boardService.update(
            nonExistentBoardId,
            {
                title: 'Board Does Not Exist'
            }
        )

        expect(result).toBeNull()
    })
})