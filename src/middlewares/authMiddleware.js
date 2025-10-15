import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

// Middleware này sẽ đảm nhiệm việc quan trọng: Xác thực cái JWT accessToken nhận được từ phía FE có hợp lệ hay không
const isAuthorized = async (req, res, next) => {
    // Check token từ client
    const clientAccessToken = req.cookies?.accessToken
    if (!clientAccessToken) {
        next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized! (token not found)'))
        return
    }

    try {
        // Giải mã token
        const accessTokenDecoded = await JwtProvider.verifyToken(
            clientAccessToken,
            env.ACCESS_TOKEN_SECRET_SIGNATURE
        )
        // console.log(accessTokenDecoded)

        // Gán token giải mã vào req.jwtDecoded để dễ sử dụng
        req.jwtDecoded = accessTokenDecoded

        // Cho phép request đi tiếp
        next()
    } catch (error) {
        // console.log('authMiddleware: ', error)
        // Nếu accessToken hết hạn (expired), trả về lỗi GONE-410 cho phía FE để gọi API refreshToken
        if (error?.message?.includes('jwt expired')) {
            next(new ApiError(StatusCodes.GONE, 'Need to refresh token.'))
            return
        }

        // Nếu accessToken không hợp lệ vì bất kì lí do gì khác với hết hạn, trả về lỗi UNAUTHORIZED-401 cho FE gọi API logout
        next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))
    }
}

export const authMiddleware = { isAuthorized }