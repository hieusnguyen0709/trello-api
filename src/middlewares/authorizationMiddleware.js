import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { boardModel } from '~/models/boardModel'
import { columnModel } from '~/models/columnModel'
import { cardModel } from '~/models/cardModel'
import { labelModel } from '~/models/labelModel'

const verifyBoardAccess = async (userId, boardId) => {
    const board = await boardModel.findOneById(boardId)
    if (!board) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found!')
    }

    const isOwner = board.ownerIds.some(id => id.toString() === userId)
    const isMember = board.memberIds.some(id => id.toString() === userId)

    if (!isOwner && !isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this board!')
    }

    return board
}

const hasBoardAccess = (resolveBoardId) => {
    return async (req, res, next) => {
        try {
            const userId = req.jwtDecoded._id
            const boardId = await resolveBoardId(req)
            req.board = await verifyBoardAccess(userId, boardId)
            next()
        } catch (error) {
            next(error)
        }
    }
}

const resolvers = {
    fromParamsId: (req) => req.params.id,

    fromBodyBoardId: (req) => req.body.boardId,

    fromColumnParamsId: async (req) => {
        const column = await columnModel.findOneById(req.params.id)
        if (!column) throw new ApiError(StatusCodes.NOT_FOUND, 'Column not found!')
        return column.boardId
    },

    fromCardParamsId: async (req) => {
        const card = await cardModel.findOneById(req.params.id)
        if (!card) throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
        return card.boardId
    },

    fromMoveCardBody: async (req) => {
        const card = await cardModel.findOneById(req.body.currentCardId)
        if (!card) throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
        return card.boardId
    },

    fromLabelParamsId: async (req) => {
        const label = await labelModel.findOneById(req.params.id)
        if (!label) throw new ApiError(StatusCodes.NOT_FOUND, 'Label not found!')
        return label.boardId
    },

    fromToggleLabelBody: async (req) => {
        const card = await cardModel.findOneById(req.body.cardId)
        if (!card) throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
        return card.boardId
    }
}

export const authorizationMiddleware = { hasBoardAccess, resolvers }