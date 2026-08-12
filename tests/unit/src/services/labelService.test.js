import { labelService } from '~/services/labelService'
import { labelModel } from '~/models/labelModel'
import { cardModel } from '~/models/cardModel'

jest.mock('~/config/mongodb')
jest.mock('~/models/labelModel')
jest.mock('~/models/cardModel')

describe('labelService.createNew', () => {
    it('Throw a 409 ApiError when a label with the same title and color already exists', async () => {
        labelModel.findByTitleAndColor.mockResolvedValue({ _id: 'label1', title: 'Bug', color: 'red' })

        await expect(
            labelService.createNew({ boardId: 'board1', title: 'Bug', color: 'red' })
        ).rejects.toThrow('Label with this title and color already exists')
    })

    it('Create the label and return the result from labelModel.createNew directly', async () => {
        labelModel.findByTitleAndColor.mockResolvedValue(null)
        labelModel.createNew.mockResolvedValue({ _id: 'label1', boardId: 'board1', title: 'Bug', color: 'red' })

        const result = await labelService.createNew({ boardId: 'board1', title: 'Bug', color: 'red' })

        expect(labelModel.createNew).toHaveBeenCalledWith({ boardId: 'board1', title: 'Bug', color: 'red' })
        expect(result).toEqual({ _id: 'label1', boardId: 'board1', title: 'Bug', color: 'red' })
    })
})

describe('labelService.update', () => {
    it('Throw a 400 ApiError when neither title nor color is provided', async () => {
        await expect(labelService.update('label1', {})).rejects.toThrow('Nothing to update')
    })


    it('Allow updating only the title, without requiring color', async () => {
        labelModel.update.mockResolvedValue({ _id: 'label1', title: 'New Title' })

        const result = await labelService.update('label1', { title: 'New Title' })

        expect(labelModel.update).toHaveBeenCalledWith('label1', { title: 'New Title' })
        expect(result.title).toBe('New Title')
    })

    it('Allow updating only the color, without requiring title', async () => {
        labelModel.update.mockResolvedValue({ _id: 'label1', color: 'blue' })

        const result = await labelService.update('label1', { color: 'blue' })

        expect(labelModel.update).toHaveBeenCalledWith('label1', { color: 'blue' })
        expect(result.color).toBe('blue')
    })
})

describe('labelService.toggle', () => {
    it('Throw a raw TypeError when the card does not exist (no existence check)', async () => {
        cardModel.findOneById.mockResolvedValue(null)

        await expect(
            labelService.toggle({ cardId: 'nonexistent', labelId: 'label1' })
        ).rejects.toThrow()
    })

    it('Pull the label when the card already has it', async () => {
        cardModel.findOneById.mockResolvedValue({
            _id: 'card1',
            labelIds: [{ toString: () => 'label1' }, { toString: () => 'label2' }]
        })
        cardModel.pullLabelIds.mockResolvedValue({})

        await labelService.toggle({ cardId: 'card1', labelId: 'label1' })

        expect(cardModel.pullLabelIds).toHaveBeenCalledWith('card1', 'label1')
        expect(cardModel.pushLabelIds).not.toHaveBeenCalled()
    })

    it('Push the label when the card does not have it yet', async () => {
        cardModel.findOneById.mockResolvedValue({
            _id: 'card1',
            labelIds: [{ toString: () => 'label2' }]
        })
        cardModel.pushLabelIds.mockResolvedValue({})

        await labelService.toggle({ cardId: 'card1', labelId: 'label1' })

        expect(cardModel.pushLabelIds).toHaveBeenCalledWith('card1', 'label1')
        expect(cardModel.pullLabelIds).not.toHaveBeenCalled()
    })
})