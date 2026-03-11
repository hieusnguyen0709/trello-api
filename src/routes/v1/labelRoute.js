import express from 'express'
import { labelController } from '~/controllers/labelController'
import { labelValidation } from '~/validations/labelValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/')
    .post(authMiddleware.isAuthorized, labelValidation.createNew, labelController.createNew)

Router.route('/:id')
    .put(authMiddleware.isAuthorized, labelValidation.update, labelController.update)
    .delete(authMiddleware.isAuthorized, labelController.deleteOne)

Router.route('/toggle')
    .post(authMiddleware.isAuthorized, labelValidation.toggle, labelController.toggle)

export const labelRoute = Router
