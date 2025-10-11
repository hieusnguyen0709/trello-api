// Lưu ý Brevo là tên thương hiệu mới của sib - Sendinblue
// Vì thế trong phần hướng dẫn trên github có thể nó vẫn còn giữ tên biến SibApiV3Sdk
// https://github.com/getbrevo/brevo-node
const SibApiV3Sdk = require('@getbrevo/brevo')
import { env } from '~/config/environment'

/**
 * Có thể xem thêm phần docs cấu hình theo từng ngôn ngữ khác nhau tùy dự án ở Brevo Dashboard > Account > SMTP & API > API Keys
 * https://brevo.com
 * Với Nodejs thì tốt nhất cứ lên github repo của bọn nó là nhanh nhất:
 * https://github.com/getbrevo/brevo-node
 */

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
let apiKey = apiInstance.authentications['apiKey']
apiKey.apiKey = env.BREVO_API_KEY
console.log(env.BREVO_API_KEY)
console.log(env.ADMIN_EMAIL_ADDRESS)
console.log(env.ADMIN_EMAIL_NAME)

const sendEmail = async (recipientEmail, customSubject, customHtmlContent) => {
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

    sendSmtpEmail.sender = { email: env.ADMIN_EMAIL_ADDRESS, name: env.ADMIN_EMAIL_NAME }

    sendSmtpEmail.to = [{ email: recipientEmail }]

    sendSmtpEmail.subject = customSubject

    sendSmtpEmail.htmlContent = customHtmlContent

    return apiInstance.sendTransacEmail(sendSmtpEmail)
}

export const BrevoProvider = {
    sendEmail
}