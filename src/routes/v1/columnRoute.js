import express from 'express'
import { columnValidation } from '~/validations/columnValidation'
import { columnController } from '~/controllers/columnController'
import { authenticationMiddleware as authn } from '~/middlewares/authenticationMiddleware'
import { authorizationMiddleware as authz } from '~/middlewares/authorizationMiddleware'

const Router = express.Router()

Router.route('/')
    .post(authn.isAuthenticated, columnValidation.createNew, authz.hasBoardAccess(authz.resolvers.fromBodyBoardId), columnController.createNew)

Router.route('/:id')
    .put(authn.isAuthenticated, columnValidation.update, authz.hasBoardAccess(authz.resolvers.fromColumnParamsId), columnController.update)
    .delete(authn.isAuthenticated, columnValidation.deleteItem, authz.hasBoardAccess(authz.resolvers.fromColumnParamsId), columnController.deleteItem)

export const columnRoute = Router