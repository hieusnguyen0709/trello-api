import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'
import { boardModel } from '~/models/boardModel'
import { invitationModel } from '~/models/invitationModel'
import { INVITATION_TYPES, BOARD_INVITATION_STATUS } from '~/utils/constants'
import { pickUser } from '~/utils/formatters'

const createNewBoardInvitation = async (reqBody, inviterId) => {
  try {
    // Người đi mời: chính là người đang request, nên chúng ta tìm theo id lấy từ token
    const inviter = await userModel.findOneById(inviterId)
    // Người được mời: lấy theo email nhận từ phía FE
    const invitee = await userModel.findOneByEmail(reqBody.inviteeEmail)
    // Tìm luôn cái board ra để lấy data xử lý
    const board = await boardModel.findOneById(reqBody.boardId)

    // Nếu không tồn tại 1 trong 3 thì cứ thẳng tay reject
    if (!invitee || !inviter || !board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Inviter, Invitee or Board not found!')
    }

    // Tạo data cần thiết để lưu vào trong DB
    // Có thể thử bỏ hoặc làm sai lệch type, boardInvitation, status để test xem Model validate ok chưa
    const newInvitationData = {
        inviterId,
        inviteeId: invitee._id.toString(), // chuyển từ ObjectId về String vì sang bên Model có check lại data ở hàm create
        type: INVITATION_TYPES.BOARD_INVITATION,
        boardInvitation: {
            boardId: board._id.toString(),
            status: BOARD_INVITATION_STATUS.PENDING
        }
    }

    // Gọi sang Model để lưu vào DB
    const createdInvitation = await invitationModel.createNewBoardInvitation(newInvitationData)
    const getInvitation = await invitationModel.findOneById(createdInvitation.insertedId)

    // Ngoài thông tin của cái board invitation mới tạo thì trả về đủ cả luôn board, inviter, invitee cho FE thoải mái xử lý.
    const resInvitation = {
        ...getInvitation,
        board,
        inviter: pickUser(inviter),
        invitee: pickUser(invitee)
    }

    return resInvitation
    } catch (error) { throw error }
}

export const invitationService = {
    createNewBoardInvitation
}