import { boardService } from '~/services/boardService'
import { boardModel } from '~/models/boardModel'
import { columnModel } from '~/models/columnModel'
import { cardModel } from '~/models/cardModel'

jest.mock('~/models/boardModel')
jest.mock('~/models/columnModel')
jest.mock('~/models/cardModel')

describe('boardService.createNew', () => {
    it('Creates a slug from the title and passes it to boardModel.createNew, then fetches the full board using the inserted ID', async () => {
        const userId = 'user123'
        const reqBody = { title: 'Dự Án Trello', type: 'public' }

        boardModel.createNew.mockResolvedValue({ insertedId: 'newBoardId456' })
        boardModel.findOneById.mockResolvedValue({
            _id: 'newBoardId456',
            title: 'Dự Án Trello',
            type: 'public',
            slug: 'du-an-trello'
        })

        const result = await boardService.createNew(userId, reqBody)

        expect(boardModel.createNew).toHaveBeenCalledWith(userId, {
            title: 'Dự Án Trello',
            type: 'public',
            slug: 'du-an-trello'
        })

        expect(boardModel.findOneById).toHaveBeenCalledWith('newBoardId456')

        expect(result).toEqual({
            _id: 'newBoardId456',
            title: 'Dự Án Trello',
            type: 'public',
            slug: 'du-an-trello'
        })
    })
})

const fakeObjectId = (id) => ({
  id,
  equals(other) {
    const otherId = (other && typeof other === 'object') ? other.id : other
    return this.id === otherId
  }
})

describe('boardService.getDetails', () => {
    it('Call boardModel.getDetails with the correct userId and boardId', async () => {
        const fakeBoard = {
            _id: fakeObjectId('board1'),
            columns: [{ _id: fakeObjectId('col1') }],
            cards: [{ _id: fakeObjectId('card1'), columnId: fakeObjectId('col1') }]
        }
        boardModel.getDetails.mockResolvedValue(fakeBoard)

        await boardService.getDetails('user123', 'board456')

        expect(boardModel.getDetails).toHaveBeenCalledWith('user123', 'board456')
    })

    it('Throw a 404 ApiError when the board is not found', async () => {
        boardModel.getDetails.mockResolvedValue(null)

        await expect(boardService.getDetails('user1', 'nonexistent')).rejects.toThrow('Board not found!')
    })

    it('Do not mutate the board object returned by boardModel', async () => {
        const fakeBoard = {
            _id: fakeObjectId('board1'),
            title: 'Dự Án Trello',
            columns: [
                { _id: fakeObjectId('col1') },
                { _id: fakeObjectId('col2') }
            ],
            cards: [
                { _id: fakeObjectId('card1'), columnId: fakeObjectId('col1') },
                { _id: fakeObjectId('card2'), columnId: fakeObjectId('col2') },
                { _id: fakeObjectId('card3'), columnId: fakeObjectId('col1') }
            ]
        }
        boardModel.getDetails.mockResolvedValue(fakeBoard)

        await boardService.getDetails('user1', 'board1')

        expect(fakeBoard).toHaveProperty('cards')
        expect(fakeBoard.columns[0]).not.toHaveProperty('cards')
    })

    it('Group cards into their corresponding columns based on columnId', async () => {
        const fakeBoard = {
            _id: fakeObjectId('board1'),
            title: 'Dự Án Trello',
            columns: [
                { _id: fakeObjectId('col1') },
                { _id: fakeObjectId('col2') }
            ],
            cards: [
                { _id: fakeObjectId('card1'), columnId: fakeObjectId('col1') },
                { _id: fakeObjectId('card2'), columnId: fakeObjectId('col2') },
                { _id: fakeObjectId('card3'), columnId: fakeObjectId('col1') }
            ]
        }

        boardModel.getDetails.mockResolvedValue(fakeBoard)

        const result = await boardService.getDetails('user1', 'board1')

        // column col1 must contain 2 cards (card1, card3)
        expect(result.columns[0].cards).toHaveLength(2)
        expect(result.columns[0].cards.map(c => c._id.id)).toEqual(['card1', 'card3'])

        // column col2 must contain 1 card (card2)
        expect(result.columns[1].cards).toHaveLength(1)
        expect(result.columns[1].cards[0]._id.id).toBe('card2')
    })

    it('Remove the flat cards field from the final result', async () => {
        const fakeBoard = {
            _id: fakeObjectId('board1'),
            title: 'Dự Án Trello',
            columns: [
                { _id: fakeObjectId('col1') },
                { _id: fakeObjectId('col2') }
            ],
            cards: [
                { _id: fakeObjectId('card1'), columnId: fakeObjectId('col1') },
                { _id: fakeObjectId('card2'), columnId: fakeObjectId('col2') },
                { _id: fakeObjectId('card3'), columnId: fakeObjectId('col1') }
            ]
        }
        boardModel.getDetails.mockResolvedValue(fakeBoard)

        const result = await boardService.getDetails('user1', 'board1')

        expect(result).not.toHaveProperty('cards')
    })
})

describe('boardService.update', () => {
    const FIXED_TIMESTAMP = 1700000000000

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('Add an updatedAt timestamp before calling boardModel.update', async () => {
        boardModel.update.mockResolvedValue({
            _id: 'board1',
            title: 'New Title',
            updatedAt: FIXED_TIMESTAMP
        })

        const result = await boardService.update('board1', { title: 'New Title' })

        expect(boardModel.update).toHaveBeenCalledWith('board1', {
            title: 'New Title',
            updatedAt: FIXED_TIMESTAMP
        })
        expect(result.updatedAt).toBe(FIXED_TIMESTAMP)
    })
})

describe('boardService.moveCardToDifferentColumn', () => {
    const FIXED_TIMESTAMP = 1700000000000

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('Update the previous column with its new cardOrderIds first', async () => {
        columnModel.update.mockResolvedValue({})
        cardModel.update.mockResolvedValue({})

        const reqBody = {
            prevColumnId: 'col1',
            prevCardOrderIds: ['card2'],
            nextColumnId: 'col2',
            nextCardOrderIds: ['card1', 'card3'],
            currentCardId: 'card1'
        }

        await boardService.moveCardToDifferentColumn(reqBody)

        expect(columnModel.update).toHaveBeenNthCalledWith(1, 'col1', {
            cardOrderIds: ['card2'],
            updatedAt: FIXED_TIMESTAMP
        })
    })

    it('Update the next column with its new cardOrderIds second', async () => {
        columnModel.update.mockResolvedValue({})
        cardModel.update.mockResolvedValue({})

        const reqBody = {
            prevColumnId: 'col1',
            prevCardOrderIds: ['card2'],
            nextColumnId: 'col2',
            nextCardOrderIds: ['card1', 'card3'],
            currentCardId: 'card1'
        }

        await boardService.moveCardToDifferentColumn(reqBody)

        expect(columnModel.update).toHaveBeenNthCalledWith(2, 'col2', {
            cardOrderIds: ['card1', 'card3'],
            updatedAt: FIXED_TIMESTAMP
        })
    })

    it('Update the card with its new columnId', async () => {
        columnModel.update.mockResolvedValue({})
        cardModel.update.mockResolvedValue({})

        const reqBody = {
            prevColumnId: 'col1',
            prevCardOrderIds: ['card2'],
            nextColumnId: 'col2',
            nextCardOrderIds: ['card1', 'card3'],
            currentCardId: 'card1'
        }

        await boardService.moveCardToDifferentColumn(reqBody)

        expect(cardModel.update).toHaveBeenCalledWith('card1', { columnId: 'col2' })
    })

    it('Return a success result', async () => {
        columnModel.update.mockResolvedValue({})
        cardModel.update.mockResolvedValue({})

        const result = await boardService.moveCardToDifferentColumn({
            prevColumnId: 'col1',
            prevCardOrderIds: ['card2'],
            nextColumnId: 'col2',
            nextCardOrderIds: ['card1', 'card3'],
            currentCardId: 'card1'
        })

        expect(result).toEqual({ updateResult: 'Successfully!' })
    })
})

describe('boardService.getBoards', () => {
    it('Apply default page and itemsPerPage when not provided', async () => {
        boardModel.getBoards.mockResolvedValue({ boards: [], totalBoards: 0 })

        await boardService.getBoards('user1', null, null, {})

        expect(boardModel.getBoards).toHaveBeenCalledWith('user1', 1, 12, {})
    })

    it('Parse page and itemsPerPage as integers when provided as numeric strings', async () => {
        boardModel.getBoards.mockResolvedValue({ boards: [], totalBoards: 0 })

        await boardService.getBoards('user1', '2', '20', {})

        expect(boardModel.getBoards).toHaveBeenCalledWith('user1', 2, 20, {})
    })

    it('Pass userId and queryFilters through to boardModel.getBoards unchanged', async () => {
        boardModel.getBoards.mockResolvedValue({ boards: [], totalBoards: 0 })
        const queryFilters = { title: 'Trello' }

        await boardService.getBoards('user123', 1, 12, queryFilters)

        expect(boardModel.getBoards).toHaveBeenCalledWith('user123', 1, 12, queryFilters)
    })

    it('Return the results from boardModel.getBoards', async () => {
        const fakeResults = { boards: [{ _id: 'board1' }], totalBoards: 1 }
        boardModel.getBoards.mockResolvedValue(fakeResults)

        const result = await boardService.getBoards('user1', 1, 12, {})

        expect(result).toEqual(fakeResults)
    })
})