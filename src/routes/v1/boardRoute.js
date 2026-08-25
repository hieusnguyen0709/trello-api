import express from 'express'
import { boardValidation } from '~/validations/boardValidation'
import { boardController } from '~/controllers/boardController'
import { authenticationMiddleware as authn } from '~/middlewares/authenticationMiddleware'
import { authorizationMiddleware as authz } from '~/middlewares/authorizationMiddleware'

const Router = express.Router()

Router.route('/')
    .get(authn.isAuthenticated, boardController.getBoards)
    .post(authn.isAuthenticated, boardValidation.createNew, boardController.createNew)

Router.route('/:id')
    .get(authn.isAuthenticated, boardController.getDetails)
    .put(authn.isAuthenticated, boardValidation.update, authz.hasBoardAccess(authz.resolvers.fromParamsId), boardController.update)
    .delete(authn.isAuthenticated, boardValidation.deleteItem, authz.hasBoardAccess(authz.resolvers.fromParamsId), boardController.deleteItem)

Router.route('/supports/moving_card')
    .put(authn.isAuthenticated, boardValidation.moveCardToDifferentColumn, authz.hasBoardAccess(authz.resolvers.fromMoveCardBody), boardController.moveCardToDifferentColumn)

export const boardRoute = Router