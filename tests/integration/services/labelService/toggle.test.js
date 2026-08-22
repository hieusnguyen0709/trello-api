import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { toggle } from '~/services/labelService'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestColumn } from '../../helpers/createTestColumn'
import { createTestCard } from '../../helpers/createTestCard'
import { createTestLabel } from '../../helpers/createTestLabel'
import { ObjectId } from 'mongodb'

describe('labelService.toggle - Integration Test', () => {
    let testBoard
    let testColumn
    let testCard
    let testLabel

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        testBoard = await createTestBoard({})
        testColumn = await createTestColumn({ boardId: testBoard._id })
        testCard = await createTestCard({
            boardId: testBoard._id,
            columnId: testColumn._id,
            title: 'Toggle Test Card'
        })
        testLabel = await createTestLabel({ boardId: testBoard._id, title: 'Bug', color: '#FF0000' })
    })

    afterEach(async () => {
        await GET_DB().collection('cards').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('columns').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('labels').deleteMany({ boardId: testBoard._id })
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Add labelId to card.labelIds when the card does not have it yet', async () => {
        const result = await toggle({
            cardId: testCard._id.toString(),
            labelId: testLabel._id.toString()
        })

        expect(result.labelIds.map(String)).toContain(testLabel._id.toString())

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.labelIds.map(String)).toContain(testLabel._id.toString())
    })

    it('Remove labelId from card.labelIds when the card already has it', async () => {
        // Seed sẵn: card đã có label này từ trước
        await GET_DB().collection('cards').updateOne(
            { _id: testCard._id },
            { $push: { labelIds: testLabel._id } }
        )

        const result = await toggle({
            cardId: testCard._id.toString(),
            labelId: testLabel._id.toString()
        })

        expect(result.labelIds.map(String)).not.toContain(testLabel._id.toString())

        const cardInDb = await GET_DB().collection('cards').findOne({ _id: testCard._id })
        expect(cardInDb.labelIds).toHaveLength(0)
    })

    it('Toggle twice returns the card back to its original state (add then remove)', async () => {
        await toggle({ cardId: testCard._id.toString(), labelId: testLabel._id.toString() })
        const secondResult = await toggle({ cardId: testCard._id.toString(), labelId: testLabel._id.toString() })

        expect(secondResult.labelIds).toHaveLength(0)
    })

    it('Throw 404 when card does not exist', async () => {
        const fakeCardId = new ObjectId().toString()

        await expect(
            toggle({ cardId: fakeCardId, labelId: testLabel._id.toString() })
        ).rejects.toThrow('Card not found!')
    })
})