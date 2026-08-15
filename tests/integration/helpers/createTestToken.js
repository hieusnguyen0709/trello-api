import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'

export const createTestToken = async (user) => {
    const userInfo = {
        _id: user._id.toString()
    }

    return await JwtProvider.generateToken(
        userInfo,
        env.ACCESS_TOKEN_SECRET_SIGNATURE,
        '1h'
    )
}