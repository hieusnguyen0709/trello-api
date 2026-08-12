import ApiError from '~/utils/ApiError'

describe('ApiError', () => {
    it('Create an instance of both ApiError and the built-in Error class', () => {
        const error = new ApiError(404, 'Board not found')
        expect(error).toBeInstanceOf(ApiError)
        expect(error).toBeInstanceOf(Error)
    })

    it('Set the message correctly via the parent Error constructor', () => {
        const error = new ApiError(404, 'Board not found')
        expect(error.message).toBe('Board not found')
    })

    it('Set the name to "ApiError" instead of the default "Error"', () => {
        const error = new ApiError(404, 'Board not found')
        expect(error.name).toBe('ApiError')
    })

    it('Set the statusCode property', () => {
        const error = new ApiError(404, 'Board not found')
        expect(error.statusCode).toBe(404)
    })

    it('Capture a stack trace', () => {
        const error = new ApiError(404, 'Board not found')
        expect(error.stack).toBeDefined()
    })

    it('Can be thrown and caught like a normal error', () => {
        expect(() => {
            throw new ApiError(409, 'Email already exists')
        }).toThrow('Email already exists')
    })
})
