import { invitationService } from '~/services/invitationService'
import { userModel } from '~/models/userModel'
import { boardModel } from '~/models/boardModel'
import { invitationModel } from '~/models/invitationModel'

jest.mock('~/config/mongodb')
jest.mock('~/models/userModel')
jest.mock('~/models/boardModel')
jest.mock('~/models/invitationModel')

const fakeObjectId = (id) => ({ toString: () => id })

describe('invitationService.createNewBoardInvitation', () => {
    it('Throw a 404 ApiError when inviter, invitee, or board is not found', async () => {
        userModel.findOneById.mockResolvedValue(null)
        userModel.findOneByEmail.mockResolvedValue({ _id: fakeObjectId('invitee1') })
        boardModel.findOneById.mockResolvedValue({ _id: fakeObjectId('board1') })

        await expect(
            invitationService.createNewBoardInvitation({ inviteeEmail: 'a@b.com', boardId: 'board1' }, 'inviter1')
        ).rejects.toThrow('Inviter, Invitee or Board not found!')
    })

    it('Convert inviteeId and boardId to strings before saving the invitation', async () => {
        userModel.findOneById.mockResolvedValue({ _id: fakeObjectId('inviter1'), email: 'inviter@test.com' })
        userModel.findOneByEmail.mockResolvedValue({ _id: fakeObjectId('invitee1'), email: 'invitee@test.com' })
        boardModel.findOneById.mockResolvedValue({ _id: fakeObjectId('board1'), title: 'Trello Board' })
        invitationModel.createNewBoardInvitation.mockResolvedValue({ insertedId: 'invite1' })
        invitationModel.findOneById.mockResolvedValue({ _id: 'invite1' })

        await invitationService.createNewBoardInvitation({ inviteeEmail: 'invitee@test.com', boardId: 'board1' }, 'inviter1')

        expect(invitationModel.createNewBoardInvitation).toHaveBeenCalledWith(
            expect.objectContaining({
                inviteeId: 'invitee1',
                boardInvitation: expect.objectContaining({ boardId: 'board1' })
            })
        )
    })

    it('Return the invitation merged with the full board and pickUser-filtered inviter and invitee', async () => {
        const inviter = { _id: fakeObjectId('inviter1'), email: 'inviter@test.com', password: 'secret-hash' }
        const invitee = { _id: fakeObjectId('invitee1'), email: 'invitee@test.com', password: 'secret-hash' }
        const board = { _id: fakeObjectId('board1'), title: 'Trello Board' }

        userModel.findOneById.mockResolvedValue(inviter)
        userModel.findOneByEmail.mockResolvedValue(invitee)
        boardModel.findOneById.mockResolvedValue(board)
        invitationModel.createNewBoardInvitation.mockResolvedValue({ insertedId: 'invite1' })
        invitationModel.findOneById.mockResolvedValue({ _id: 'invite1', type: 'BOARD_INVITATION' })

        const result = await invitationService.createNewBoardInvitation({ inviteeEmail: 'invitee@test.com', boardId: 'board1' }, 'inviter1')

        expect(result.board).toEqual(board)
        expect(result.inviter).not.toHaveProperty('password')
        expect(result.invitee).not.toHaveProperty('password')
        expect(result._id).toBe('invite1')
    })
})

describe('invitationService.getInvitations', () => {
    it('Extract the first element from inviter, invitee, and board arrays', async () => {
        invitationModel.findByUser.mockResolvedValue([
        {
            _id: 'invite1',
            inviter: [{ _id: 'user1', email: 'inviter@test.com' }],
            invitee: [{ _id: 'user2', email: 'invitee@test.com' }],
            board: [{ _id: 'board1', title: 'Trello Board' }]
        }
        ])

        const result = await invitationService.getInvitations('user1')

        expect(result[0].inviter).toEqual({ _id: 'user1', email: 'inviter@test.com' })
        expect(result[0].invitee).toEqual({ _id: 'user2', email: 'invitee@test.com' })
        expect(result[0].board).toEqual({ _id: 'board1', title: 'Trello Board' })
    })

    it('Default to an empty object when inviter, invitee, or board array is empty', async () => {
        invitationModel.findByUser.mockResolvedValue([
            { _id: 'invite1', inviter: [], invitee: [], board: [] }
        ])

        const result = await invitationService.getInvitations('user1')

        expect(result[0].inviter).toEqual({})
        expect(result[0].invitee).toEqual({})
        expect(result[0].board).toEqual({})
    })

    it('Return an empty array when the user has no invitations', async () => {
        invitationModel.findByUser.mockResolvedValue([])

        const result = await invitationService.getInvitations('user1')

        expect(result).toEqual([])
    })
})

describe('invitationService.updateBoardInvitation', () => {
    it('Throw a 404 ApiError when the invitation is not found', async () => {
        invitationModel.findOneById.mockResolvedValue(null)

        await expect(
            invitationService.updateBoardInvitation('user1', 'invite1', 'ACCEPTED')
        ).rejects.toThrow('Invitation not found!')
    })

    it('Throw a 404 ApiError when the board is not found', async () => {
        invitationModel.findOneById.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'PENDING' }
        })
        boardModel.findOneById.mockResolvedValue(null)

        await expect(
            invitationService.updateBoardInvitation('user1', 'invite1', 'ACCEPTED')
        ).rejects.toThrow('Board not found!')
    })

    it('Throw a 406 ApiError when accepting an invitation for a board the user already belongs to', async () => {
        invitationModel.findOneById.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'PENDING' }
        })
        boardModel.findOneById.mockResolvedValue({
            _id: 'board1',
            ownerIds: [fakeObjectId('user1')],
            memberIds: []
        })

        await expect(
            invitationService.updateBoardInvitation('user1', 'invite1', 'ACCEPTED')
        ).rejects.toThrow('You are already a member of this board.')
    })

    it('Preserve other boardInvitation fields (like boardId) when updating the status', async () => {
        invitationModel.findOneById.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'PENDING' }
        })
        boardModel.findOneById.mockResolvedValue({
            _id: 'board1',
            ownerIds: [fakeObjectId('someone-else')],
            memberIds: []
        })
        invitationModel.update.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'REJECTED' }
        })

        await invitationService.updateBoardInvitation('user1', 'invite1', 'REJECTED')

        expect(invitationModel.update).toHaveBeenCalledWith('invite1', {
            boardInvitation: { boardId: 'board1', status: 'REJECTED' }
        })
    })

    it('Push the user into the board members when the status becomes ACCEPTED', async () => {
        invitationModel.findOneById.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'PENDING' }
        })
        boardModel.findOneById.mockResolvedValue({
            _id: 'board1',
            ownerIds: [fakeObjectId('someone-else')],
            memberIds: []
        })
        invitationModel.update.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'ACCEPTED' }
        })

        await invitationService.updateBoardInvitation('user1', 'invite1', 'ACCEPTED')

        expect(boardModel.pushMemberIds).toHaveBeenCalledWith('board1', 'user1')
    })

    it('Not push the user into board members when the status is not ACCEPTED', async () => {
        invitationModel.findOneById.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'PENDING' }
        })
        boardModel.findOneById.mockResolvedValue({
            _id: 'board1',
            ownerIds: [fakeObjectId('someone-else')],
            memberIds: []
        })
        invitationModel.update.mockResolvedValue({
            _id: 'invite1',
            boardInvitation: { boardId: 'board1', status: 'REJECTED' }
        })

        await invitationService.updateBoardInvitation('user1', 'invite1', 'REJECTED')

        expect(boardModel.pushMemberIds).not.toHaveBeenCalled()
    })
})