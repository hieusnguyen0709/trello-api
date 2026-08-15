import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'

export const createTestToken = async (user) => {
    const userInfo = {
        _id: user._id.toString()
    }

    const secretSignature =
        process.env.ACCESS_TOKEN_SECRET_SIGNATURE ||
        env.ACCESS_TOKEN_SECRET_SIGNATURE

    return await JwtProvider.generateToken(
        userInfo,
        secretSignature,
        '1h'
    )
}