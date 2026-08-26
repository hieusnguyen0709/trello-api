import express from 'express'
import { cardValidation } from '~/validations/cardValidation'
import { cardController } from '~/controllers/cardController'
import { authenticationMiddleware as authn } from '~/middlewares/authenticationMiddleware'
import { authorizationMiddleware as authz } from '~/middlewares/authorizationMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

Router.route('/')
  .post(authn.isAuthenticated, cardValidation.createNew, authz.hasBoardAccess(authz.resolvers.fromBodyBoardId), cardController.createNew)

Router.route('/:id')
  .put(
    authn.isAuthenticated,
    multerUploadMiddleware.upload.fields([
      { name: 'cardCover', maxCount: 1 },
      { name: 'cardAttachments', maxCount: 10 }
    ]),
    cardValidation.update,
    authz.hasBoardAccess(authz.resolvers.fromCardParamsId),
    cardController.update
  )
  .delete(
    authn.isAuthenticated,
    cardValidation.deleteItem,
    authz.hasBoardAccess(authz.resolvers.fromCardParamsId),
    cardController.deleteItem
  )

export const cardRoute = Router