import cloudinary from 'cloudinary'
import streamifier from 'streamifier'
import { env } from '~/config/environment'

// Config cloudinary - version
const cloudinaryV2 = cloudinary.v2
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
})

// Function upload
const streamUpload = (fileBuffer, folderName) => {
    return new Promise((resolve, reject) => {
        // Tạo một cái luồng stream upload lên cloudiary
        const stream = cloudinaryV2.uploader.upload_stream({ folder: folderName }, (err, result) => {
            if (err) reject(err)
            else resolve(result)
        })
        // Thực hiện upload luồng trên bằng lib streamifier
        streamifier.createReadStream(fileBuffer).pipe(stream)
    })
}

export const CloudinaryProvider = { streamUpload }