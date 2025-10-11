import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatters'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { BrevoProvider } from '~/providers/BrevoProvider'

const createNew = async (reqBody) => {
    try {
        const existUser = await userModel.findOneByEmail(reqBody.email)
        if (existUser) {
            throw new ApiError(StatusCodes.CONFLICT, 'Email already exists!')
        }

        const nameFromEmail = reqBody.email.split('@')[0]
        const newUser = {
            email: reqBody.email,
            password: bcryptjs.hashSync(reqBody.password, 8),
            username: nameFromEmail,
            displayName: nameFromEmail,
            verifyToken: uuidv4()
        }

        const createdUser = await userModel.createNew(newUser)
        const getNewUser = await userModel.findOneById(createdUser.insertedId)

        const verifycationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getNewUser.email}&token=${getNewUser.verifyToken}`
        const customSubject = 'Please verify your email before using our services!'
        const htmlContent = `
            <h3>Here is your verification link:</h3>
            <h3>${verifycationLink}</h3>
            <h3>Sincerely</h3>
        `

        await BrevoProvider.sendEmail(getNewUser.email, customSubject, htmlContent)

        return pickUser(getNewUser)
    } catch (error) {
        throw error
    }
}

export const userService = {
    createNew
}