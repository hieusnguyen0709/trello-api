import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { invitationService } from '~/services/invitationService'
import { createTestUser } from '../../helpers/createTestUser'
import { createTestBoard } from '../../helpers/createTestBoard'
import { createTestInvitation } from '../../helpers/createTestInvitation'
import { BOARD_INVITATION_STATUS } from '~/utils/constants'
import { ObjectId } from 'mongodb'

describe('invitationService.getInvitations - Integration Test', () => {
    let currentUser
    let otherUser
    let inviter
    let testBoard

    beforeAll(async () => {
        await CONNECT_DB()
    })

    beforeEach(async () => {
        currentUser = await createTestUser()
        otherUser = await createTestUser()
        inviter = await createTestUser()
        testBoard = await createTestBoard({})
    })

    afterEach(async () => {
        await GET_DB().collection('invitations').deleteMany({})
        await GET_DB().collection('boards').deleteOne({ _id: testBoard._id })
        await GET_DB().collection('users').deleteMany({
            _id: { $in: [currentUser._id, otherUser._id, inviter._id] }
        })
    })

    afterAll(async () => {
        await CLOSE_DB()
    })

    it('Return invitations where the user is the invitee, with inviter/invitee/board flattened from arrays to objects', async () => {
        await createTestInvitation({
            inviterId: inviter._id,
            inviteeId: currentUser._id,
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING }
        })

        const result = await invitationService.getInvitations(currentUser._id.toString())

        expect(result).toHaveLength(1)
        expect(Array.isArray(result[0].inviter)).toBe(false) // đã flatten, không còn là mảng
        expect(result[0].inviter._id.toString()).toBe(inviter._id.toString())
        expect(result[0].invitee._id.toString()).toBe(currentUser._id.toString())
        expect(result[0].board._id.toString()).toBe(testBoard._id.toString())
    })

    it('Exclude password and verifyToken from inviter and invitee', async () => {
        await createTestInvitation({
            inviterId: inviter._id,
            inviteeId: currentUser._id,
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING }
        })

        const result = await invitationService.getInvitations(currentUser._id.toString())

        expect(result[0].inviter.password).toBeUndefined()
        expect(result[0].inviter.verifyToken).toBeUndefined()
        expect(result[0].invitee.password).toBeUndefined()
        expect(result[0].invitee.verifyToken).toBeUndefined()
    })

    it('Do NOT return invitations belonging to a different user', async () => {
        await createTestInvitation({
            inviterId: inviter._id,
            inviteeId: otherUser._id, // mời otherUser, không phải currentUser
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING }
        })

        const result = await invitationService.getInvitations(currentUser._id.toString())

        expect(result).toHaveLength(0)
    })

    it('Exclude soft-deleted invitations (_destroy: true)', async () => {
        await createTestInvitation({
            inviterId: inviter._id,
            inviteeId: currentUser._id,
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING },
            _destroy: true
        })

        const result = await invitationService.getInvitations(currentUser._id.toString())

        expect(result).toHaveLength(0)
    })

    it('Return an empty array when user has no invitations', async () => {
        const result = await invitationService.getInvitations(currentUser._id.toString())

        expect(result).toEqual([])
    })

    it('Set inviter/invitee/board to empty object when the referenced document no longer exists', async () => {
        const deletedUserId = new ObjectId()

        await createTestInvitation({
            inviterId: deletedUserId, // user này không tồn tại trong DB
            inviteeId: currentUser._id,
            boardInvitation: { boardId: testBoard._id, status: BOARD_INVITATION_STATUS.PENDING }
        })

        const result = await invitationService.getInvitations(currentUser._id.toString())

        expect(result[0].inviter).toEqual({}) // $lookup không tìm thấy -> mảng rỗng -> Service fallback thành {}
    })
})