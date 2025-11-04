import { StatusCodes } from 'http-status-codes'
import multer from 'multer'
import ApiError from '~/utils/ApiError'
import { LIMIT_COMMON_FILE_SIZE, ALLOW_COMMON_FILE_TYPES } from '~/utils/validators'

const customFileFilter = (req, file, callback) => {
    // console.log('Multer File: ', file)

    // Đối với multer, kiểm tra kiểu file thì sử dụng mimetype
    if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
        const errMessage = 'File type is invalid. Only accept jpg, jpeg and png'
        return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
    }

    return callback(null, true)
}

// Khởi tạo function upload được bọc bởi thằng multer
const upload = multer({
    limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
    fileFilter: customFileFilter
})

export const multerUploadMiddleware = { upload }