import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { invitationService } from '~/services/invitationService'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { ObjectId } from 'mongodb'

describe('invitationService.createNewBoardInvitation - Integration Test', () => {
    let inviter
    let invitee
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        inviter = await createTestUser()
        invitee = await createTestUser()
        testBoard = await createTestBoard({ ownerIds: [inviter._id] })
    })

    afterEach(async () => {
        await GET_DB().collection('invitations').deleteMany({})
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
        await GET_DB().collection('users').deleteMany({ _id: { $in: [inviter._id, invitee._id] } })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Create a new board invitation and persists it in the DB', async () => {
        const reqBody = {
            inviteeEmail: invitee.email,
            boardId: testBoard._id.toString()
        }

        const result = await invitationService.createNewBoardInvitation(reqBody, inviter._id.toString())

        expect(result.inviterId.toString()).toBe(inviter._id.toString())
        expect(result.inviteeId.toString()).toBe(invitee._id.toString())
        expect(result.boardInvitation.status).toBe('PENDING')

        const invitationInDb = await GET_DB().collection('invitations').findOne({ _id: new ObjectId(result._id) })
        expect(invitationInDb).not.toBeNull()
        expect(invitationInDb.boardInvitation.boardId.toString()).toBe(testBoard._id.toString())
    })

    it('Return full board object and picked (safe) inviter/invitee info', async () => {
        const reqBody = {
            inviteeEmail: invitee.email,
            boardId: testBoard._id.toString()
        }

        const result = await invitationService.createNewBoardInvitation(reqBody, inviter._id.toString())

        // board trả về đầy đủ, không bị pick
        expect(result.board._id.toString()).toBe(testBoard._id.toString())
        expect(result.board.title).toBe(testBoard.title)

        // inviter/invitee đã qua pickUser - không được lộ password
        expect(result.inviter.password).toBeUndefined()
        expect(result.inviter.email).toBe(inviter.email)
        expect(result.invitee.password).toBeUndefined()
        expect(result.invitee.email).toBe(invitee.email)
    })

    it('Throw 404 when invitee email does not exist', async () => {
        const reqBody = {
            inviteeEmail: 'nonexistent@test.com',
            boardId: testBoard._id.toString()
        }

        await expect(
            invitationService.createNewBoardInvitation(reqBody, inviter._id.toString())
        ).rejects.toThrow('Inviter, Invitee or Board not found!')

        const invitationsInDb = await GET_DB().collection('invitations').find({}).toArray()
        expect(invitationsInDb).toHaveLength(0)
    })

    it('Throw 404 when board does not exist', async () => {
        const fakeBoardId = new ObjectId().toString()
        const reqBody = {
            inviteeEmail: invitee.email,
            boardId: fakeBoardId
        }

        await expect(
            invitationService.createNewBoardInvitation(reqBody, inviter._id.toString())
        ).rejects.toThrow('Inviter, Invitee or Board not found!')
    })

    it('Throw 404 when inviter (from token) does not exist in DB', async () => {
        const fakeInviterId = new ObjectId().toString()
        const reqBody = {
            inviteeEmail: invitee.email,
            boardId: testBoard._id.toString()
        }

        await expect(
            invitationService.createNewBoardInvitation(reqBody, fakeInviterId)
        ).rejects.toThrow('Inviter, Invitee or Board not found!')
    })
})