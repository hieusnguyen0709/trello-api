import express from 'express'
import { labelController } from '~/controllers/labelController'
import { labelValidation } from '~/validations/labelValidation'
import { authenticationMiddleware as authn } from '~/middlewares/authenticationMiddleware'
import { authorizationMiddleware as authz } from '~/middlewares/authorizationMiddleware'

const Router = express.Router()

Router.route('/')
    .post(authn.isAuthenticated, labelValidation.createNew, authz.hasBoardAccess(authz.resolvers.fromBodyBoardId), labelController.createNew)

Router.route('/:id')
    .put(authn.isAuthenticated, labelValidation.update, authz.hasBoardAccess(authz.resolvers.fromLabelParamsId), labelController.update)
    .delete(authn.isAuthenticated, authz.hasBoardAccess(authz.resolvers.fromLabelParamsId), labelController.deleteOne)

Router.route('/toggle')
    .post(authn.isAuthenticated, labelValidation.toggle, authz.hasBoardAccess(authz.resolvers.fromToggleLabelBody), labelController.toggle)

export const labelRoute = Router
