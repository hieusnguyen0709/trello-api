import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { invitationService } from '~/services/invitationService'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestInvitation } from '../../helpers/createTestInvitation'
import { BOARD_INVITATION_STATUS } from '~/utils/constants'

describe('invitationService.updateBoardInvitation - Integration Test', () => {
    let invitee
    let inviter
    let testBoard
    let testInvitation

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        invitee = await createTestUser()
        inviter = await createTestUser()
        testBoard = await createTestBoard({ ownerIds: [inviter._id] })
        testInvitation = await createTestInvitation({
            inviterId: inviter._id,
            inviteeId: invitee._id,
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING }
        })
    })

    afterEach(async () => {
        await GET_DB().collection('invitations').deleteMany({})
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
        await GET_DB().collection('users').deleteMany({ _id: { $in: [invitee._id, inviter._id] } })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Update status to ACCEPTED and adds user to board memberIds', async () => {
        const result = await invitationService.updateBoardInvitation(
            invitee._id.toString(),
            testInvitation._id.toString(),
            BOARD_INVITATION_STATUS.ACCEPTED
        )

        expect(result.boardInvitation.status).toBe(BOARD_INVITATION_STATUS.ACCEPTED)

        const invitationInDb = await GET_DB().collection('invitations').findOne({ _id: testInvitation._id })
        expect(invitationInDb.boardInvitation.status).toBe(BOARD_INVITATION_STATUS.ACCEPTED)

        const boardInDb = await GET_DB().collection('boards').findOne({ _id: testBoard._id })
        expect(boardInDb.memberIds.map(String)).toContain(invitee._id.toString())
    })

    it('Update status to REJECTED without adding user to board memberIds', async () => {
        const result = await invitationService.updateBoardInvitation(
            invitee._id.toString(),
            testInvitation._id.toString(),
            BOARD_INVITATION_STATUS.REJECTED
        )

        expect(result.boardInvitation.status).toBe(BOARD_INVITATION_STATUS.REJECTED)

        const boardInDb = await GET_DB().collection('boards').findOne({ _id: testBoard._id })
        expect(boardInDb.memberIds).toHaveLength(0)
    })

    it('Throw 406 when user tries to ACCEPT but is already a member of the board', async () => {
        // Seed sẵn: invitee đã là member của board từ trước
        await GET_DB().collection('boards').updateOne(
            { _id: testBoard._id },
            { $push: { memberIds: invitee._id } }
        )

        await expect(
            invitationService.updateBoardInvitation(
                invitee._id.toString(),
                testInvitation._id.toString(),
                BOARD_INVITATION_STATUS.ACCEPTED
            )
        ).rejects.toThrow('You are already a member of this board.')

        // Xác nhận status của invitation KHÔNG bị đổi khi bị chặn
        const invitationInDb = await GET_DB().collection('invitations').findOne({ _id: testInvitation._id })
        expect(invitationInDb.boardInvitation.status).toBe(BOARD_INVITATION_STATUS.PENDING)
    })

    it('Throw 406 when user tries to ACCEPT but is already the owner of the board', async () => {
        await GET_DB().collection('boards').updateOne(
            { _id: testBoard._id },
            { $push: { ownerIds: invitee._id } }
        )

        await expect(
            invitationService.updateBoardInvitation(
                invitee._id.toString(),
                testInvitation._id.toString(),
                BOARD_INVITATION_STATUS.ACCEPTED
            )
        ).rejects.toThrow('You are already a member of this board.')
    })

    it('Throw 404 when invitation does not exist', async () => {
        const fakeInvitationId = new (require('mongodb').ObjectId)().toString()

        await expect(
            invitationService.updateBoardInvitation(invitee._id.toString(), fakeInvitationId, BOARD_INVITATION_STATUS.ACCEPTED)
        ).rejects.toThrow('Invitation not found!')
    })

    it('Throw 404 when the board referenced by the invitation no longer exists', async () => {
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })

        await expect(
            invitationService.updateBoardInvitation(invitee._id.toString(), testInvitation._id.toString(), BOARD_INVITATION_STATUS.ACCEPTED)
        ).rejects.toThrow('Board not found!')
    })

    it('Throw 403 when the invitation does not belong to the calling user', async () => {
        const strangerUser = await createTestUser()

        await expect(
            invitationService.updateBoardInvitation(
                strangerUser._id.toString(),
                testInvitation._id.toString(),
                BOARD_INVITATION_STATUS.ACCEPTED
            )
        ).rejects.toThrow('This invitation does not belong to you!')

        // Xác nhận invitation không bị đổi, board không bị thêm nhầm member
        const invitationInDb = await GET_DB().collection('invitations').findOne({ _id: testInvitation._id })
        expect(invitationInDb.boardInvitation.status).toBe(BOARD_INVITATION_STATUS.PENDING)

        const boardInDb = await GET_DB().collection('boards').findOne({ _id: testBoard._id })
        expect(boardInDb.memberIds).toHaveLength(0)

        await GET_DB().collection('users').deleteOne({ _id: strangerUser._id })
    })
})