jest.mock('~/config/mongodb', () => ({
  mongoClientInstance: {
    connect: jest.fn(),
    db: jest.fn()
  }
}))

jest.mock('~/models/userModel')
jest.mock('~/providers/BrevoProvider')
jest.mock('bcryptjs')
jest.mock('uuid')

import { userService } from '~/services/userService'
import { userModel } from '~/models/userModel'
import { BrevoProvider } from '~/providers/BrevoProvider'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

describe('userService.createNew', () => {
    it('Throw a 409 ApiError when the email already exists', async () => {
        userModel.findOneByEmail.mockResolvedValue({ _id: 'existing-user', email: 'hieunm@gmail.com' })

        await expect(userService.createNew({ email: 'hieunm@gmail.com', password: 'Hieunm@123' })).rejects.toThrow('Email already exists!')
    })

    it('Hash the password and generate a verifyToken before calling userModel.createNew', async () => {
        userModel.findOneByEmail.mockResolvedValue(null)
        bcryptjs.hashSync.mockReturnValue('hashedPassword')
        uuidv4.mockReturnValue('verifyToken')
        userModel.createNew.mockResolvedValue({ insertedId: '1' })
        userModel.findOneById.mockResolvedValue({
            _id: '1',
            email: 'hieunm@gmail.com',
            username: 'hieunm',
            displayName: 'hieunm',
            verifyToken: 'verifyToken',
            password: 'hashedPassword',
            isActive: false
        })
        BrevoProvider.sendEmail.mockResolvedValue()

        await userService.createNew({ email: 'hieunm@gmail.com', password: 'Hieunm@123' })

        expect(userModel.createNew).toHaveBeenCalledWith({
            email: 'hieunm@gmail.com',
            password: 'hashedPassword',
            username: 'hieunm',
            displayName: 'hieunm',
            verifyToken: 'verifyToken'
        })
    })

    it('Fetch the newly created user by the inserted ID', async () => {
        userModel.findOneByEmail.mockResolvedValue(null)
        bcryptjs.hashSync.mockReturnValue('hashedPassword')
        uuidv4.mockReturnValue('verifyToken')
        userModel.createNew.mockResolvedValue({ insertedId: '1' })
        userModel.findOneById.mockResolvedValue({
            _id: '1',
            email: 'hieunm@gmail.com',
            verifyToken: 'verifyToken'
        })
        BrevoProvider.sendEmail.mockResolvedValue()

        await userService.createNew({ email: 'hieunm@gmail.com', password: 'Hieunm@123' })

        expect(userModel.findOneById).toHaveBeenCalledWith('1')
    })

    it('Send the verification email using the email and token from the fetched user, not the local data', async () => {
        userModel.findOneByEmail.mockResolvedValue(null)
        bcryptjs.hashSync.mockReturnValue('hashedPassword')
        uuidv4.mockReturnValue('verifyToken')
        userModel.createNew.mockResolvedValue({ insertedId: '1' })

        // Cố tình cho DB trả về token KHÁC với token cục bộ, để xác nhận code
        // thực sự dùng dữ liệu từ getNewUser, không phải từ newUser
        userModel.findOneById.mockResolvedValue({
            _id: '1',
            email: 'hieunm@gmail.com',
            verifyToken: 'token-from-database'
        })
        BrevoProvider.sendEmail.mockResolvedValue()

        await userService.createNew({ email: 'hieunm@gmail.com', password: 'Hieunm@123' })

        expect(BrevoProvider.sendEmail).toHaveBeenCalledWith(
            'hieunm@gmail.com',
            expect.any(String),
            expect.stringContaining('token=token-from-database')
        )
    })

    it('Return the user filtered through pickUser, without password or verifyToken', async () => {
        userModel.findOneByEmail.mockResolvedValue(null)
        bcryptjs.hashSync.mockReturnValue('hashedPassword')
        uuidv4.mockReturnValue('verifyToken')
        userModel.createNew.mockResolvedValue({ insertedId: '1' })
        userModel.findOneById.mockResolvedValue({
            _id: '1',
            email: 'hieunm@gmail.com',
            username: 'hieunm',
            displayName: 'hieunm',
            password: 'hashedPassword',
            verifyToken: 'verifyToken',
            isActive: false
        })
        BrevoProvider.sendEmail.mockResolvedValue()

        const result = await userService.createNew({ email: 'hieunm@gmail.com', password: 'Hieunm@123' })

        expect(result).not.toHaveProperty('password')
        expect(result).not.toHaveProperty('verifyToken')
        expect(result.email).toBe('hieunm@gmail.com')
    })
})