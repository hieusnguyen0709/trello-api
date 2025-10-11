import { env } from '~/config/environment'

// Những domain được phép truy cập tới tài nguyên của Server
export const WHITELIST_DOMAINS = [
    'https://trello-web-nine-flax.vercel.app'
]

export const BOARD_TYPES = {
    PUBLIC: 'public',
    PRIVATE: 'private'
}

export const WEBSITE_DOMAIN = (env.BUILD_MODE === 'production') ? env.WEBSITE_DOMAIN_PRODUCTION : env.WEBSITE_DOMAIN_DEVELOPMENT