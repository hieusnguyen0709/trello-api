import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    boardId: Joi.string()
      .required()
      .pattern(OBJECT_ID_RULE)
      .message(OBJECT_ID_RULE_MESSAGE),

    title: Joi.string()
      .required()
      .min(1)
      .max(50)
      .trim()
      .strict(),

    color: Joi.string()
      .required()
      .pattern(/^#([0-9A-F]{3}){1,2}$/i)
      .message('Color must be a valid hex color')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        new Error(error).message
      )
    )
  }
}

const update = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string()
      .min(1)
      .max(50)
      .trim()
      .strict(),

    color: Joi.string()
      .pattern(/^#([0-9A-F]{3}){1,2}$/i)
      .message('Color must be a valid hex color')
  })

  try {
    await correctCondition.validateAsync(req.body, {
      abortEarly: false,
      allowUnknown: true
    })
    next()
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        new Error(error).message
      )
    )
  }
}

export const labelValidation = {
  createNew,
  update
}