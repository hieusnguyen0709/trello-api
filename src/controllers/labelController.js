import { StatusCodes } from 'http-status-codes'
import { labelService } from '~/services/labelService'

const createNew = async (req, res, next) => {
  try {
    const result = await labelService.createNew(req.body)
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

const getByBoardId = async (req, res, next) => {
  try {
    const { boardId } = req.params
    const labels = await labelService.getByBoardId(boardId)
    res.status(StatusCodes.OK).json(labels)
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const labelId = req.params.id
    const updatedLabel = await labelService.update(labelId, req.body)
    res.status(StatusCodes.OK).json(updatedLabel)
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const labelId = req.params.id
    await labelService.deleteOne(labelId)
    res.status(StatusCodes.OK).json({ message: 'Label deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const labelController = {
  createNew,
  getByBoardId,
  update,
  deleteOne
}
