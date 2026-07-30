import { columnService } from '~/services/columnService'
import { columnModel } from '~/models/columnModel'
import { boardModel } from '~/models/boardModel'
import { cardModel } from '~/models/cardModel'

jest.mock('~/config/mongodb')
jest.mock('~/models/columnModel')
jest.mock('~/models/boardModel')
jest.mock('~/models/cardModel')

describe('columnService.createNew', () => {
    it('Create a column and push its ID into the parent board order', async () => {
        columnModel.createNew.mockResolvedValue({ insertedId: 'col1' })
        columnModel.findOneById.mockResolvedValue({ _id: 'col1', boardId: 'board1', title: 'To Do' })
        boardModel.pushColumnOrderIds.mockResolvedValue({})

        const result = await columnService.createNew({ boardId: 'board1', title: 'To Do' })

        expect(boardModel.pushColumnOrderIds).toHaveBeenCalledWith({
            _id: 'col1',
            boardId: 'board1',
            title: 'To Do',
            cards: []
        })
        expect(result.cards).toEqual([])
    })

    it('Not call boardModel.pushColumnOrderIds when the newly created column cannot be found', async () => {
        columnModel.createNew.mockResolvedValue({ insertedId: 'col1' })
        columnModel.findOneById.mockResolvedValue(null)

        const result = await columnService.createNew({ boardId: 'board1', title: 'To Do' })

        expect(boardModel.pushColumnOrderIds).not.toHaveBeenCalled()
        expect(result).toBeNull()
    })
})

describe('columnService.update', () => {
    const FIXED_TIMESTAMP = 1700000000000

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('Add an updatedAt timestamp before calling columnModel.update', async () => {
        columnModel.update.mockResolvedValue({ _id: 'col1', title: 'New Title', updatedAt: FIXED_TIMESTAMP })

        const result = await columnService.update('col1', { title: 'New Title' })

        expect(columnModel.update).toHaveBeenCalledWith('col1', {
            title: 'New Title',
            updatedAt: FIXED_TIMESTAMP
        })
        expect(result.updatedAt).toBe(FIXED_TIMESTAMP)
    })
})

describe('columnService.deleteItem', () => {
    it('Throw a 404 ApiError when the column is not found', async () => {
        columnModel.findOneById.mockResolvedValue(null)

        await expect(columnService.deleteItem('nonexistent')).rejects.toThrow('Column not found!')
    })

    it('Delete the column, its cards, and update the board order', async () => {
        const targetColumn = { _id: 'col1', boardId: 'board1', title: 'To Do' }
        columnModel.findOneById.mockResolvedValue(targetColumn)
        columnModel.deleteOneById.mockResolvedValue({})
        cardModel.deleteManyByColumnId.mockResolvedValue({})
        boardModel.pullColumnOrderIds.mockResolvedValue({})

        await columnService.deleteItem('col1')

        expect(columnModel.deleteOneById).toHaveBeenCalledWith('col1')
        expect(cardModel.deleteManyByColumnId).toHaveBeenCalledWith('col1')
        expect(boardModel.pullColumnOrderIds).toHaveBeenCalledWith(targetColumn)
    })

    it('Return a success message after deletion', async () => {
        columnModel.findOneById.mockResolvedValue({ _id: 'col1', boardId: 'board1' })
        columnModel.deleteOneById.mockResolvedValue({})
        cardModel.deleteManyByColumnId.mockResolvedValue({})
        boardModel.pullColumnOrderIds.mockResolvedValue({})

        const result = await columnService.deleteItem('col1')

        expect(result).toEqual({ deleteResult: 'Column and its Cards deleted successfully!' })
    })

    it('Not call deleteOneById, deleteManyByColumnId, or pullColumnOrderIds when the column is not found', async () => {
        columnModel.findOneById.mockResolvedValue(null)

        await expect(columnService.deleteItem('nonexistent')).rejects.toThrow()

        expect(columnModel.deleteOneById).not.toHaveBeenCalled()
        expect(cardModel.deleteManyByColumnId).not.toHaveBeenCalled()
        expect(boardModel.pullColumnOrderIds).not.toHaveBeenCalled()
    })
})