import express from 'express'
import { invitationValidation } from '~/validations/invitationValidation'
import { invitationController } from '~/controllers/invitationController'
import { authenticationMiddleware as authn } from '~/middlewares/authenticationMiddleware'
import { authorizationMiddleware as authz } from '~/middlewares/authorizationMiddleware'

const Router = express.Router()

Router.route('/board')
  .post(authn.isAuthenticated,
    invitationValidation.createNewBoardInvitation,
    authz.hasBoardAccess(authz.resolvers.fromBodyBoardId),
    invitationController.createNewBoardInvitation
  )

// Get invitations by current user
Router.route('/')
  .get(authn.isAuthenticated, invitationController.getInvitations)

Router.route('/board/:invitationId')
  .put(authn.isAuthenticated, invitationController.updateBoardInvitation)

export const invitationRoute = Router