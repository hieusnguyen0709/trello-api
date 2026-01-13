import { StatusCodes } from 'http-status-codes'
import multer from 'multer'
import ApiError from '~/utils/ApiError'
import { LIMIT_COMMON_FILE_SIZE,
    ALLOW_COMMON_FILE_TYPES,
    LIMIT_COMMON_ATTACHMENT_FILE_SIZE,
    ALLOW_COMMON_ATTACHMENT_FILE_TYPES
    } 
    from '~/utils/validators'

const customFileFilter = (req, file, callback) => {
    if (file.fieldname === 'cardCover') {
        if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
            const errMessage = 'File type is invalid. Only accept jpg, jpeg and png'
            return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
        }
    }

    if (file.fieldname === 'cardAttachments') {
        if (!ALLOW_COMMON_ATTACHMENT_FILE_TYPES.includes(file.mimetype)) {
            const errMessage = 'File type is invalid. Only accept PDF (.pdf), Word (.doc, .docx), Excel (.xls, .xlsx)'
            return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
        }
    }

    return callback(null, true)
}

// Khởi tạo function upload được bọc bởi thằng multer
const upload = multer({
    limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
    fileFilter: customFileFilter
})

export const multerUploadMiddleware = { upload }