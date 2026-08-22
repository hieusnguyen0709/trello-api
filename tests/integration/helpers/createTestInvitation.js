import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { INVITATION_TYPES, BOARD_INVITATION_STATUS } from '~/utils/constants'

export const createTestInvitation = async (customData = {}) => {
    const defaultInvitation = {
        inviterId: new ObjectId(),
        inviteeId: new ObjectId(),
        type: INVITATION_TYPES.BOARD_INVITATION,
        boardInvitation: {
            boardId: new ObjectId(),
            status: BOARD_INVITATION_STATUS.PENDING
        },
        createdAt: Date.now(),
        updatedAt: null,
        _destroy: false
    }

    const invitationData = { ...defaultInvitation, ...customData }
    const result = await GET_DB().collection('invitations').insertOne(invitationData)
    return { _id: result.insertedId, ...invitationData }
}