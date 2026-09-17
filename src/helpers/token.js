import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET || 'development-only-change-me'
const expiresIn = process.env.JWT_EXPIRES_IN || '8h'

export const createToken = (payload) => jwt.sign(payload, secret, { expiresIn })
export const verifyTokenValue = (token) => jwt.verify(token, secret)
