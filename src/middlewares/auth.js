import { verifyTokenValue } from '../helpers/token.js'

const readBearerToken = (req) => {
    const authorization = String(req.headers.authorization || '')
    if (authorization.startsWith('Bearer ')) return authorization.slice(7)

    const cookies = String(req.headers.cookie || '').split(';').map((cookie) => cookie.trim())
    const sessionCookie = cookies.find((cookie) => cookie.startsWith('restaurant_token='))
    return sessionCookie?.slice('restaurant_token='.length)
}

export const verifyToken = (req, res, next) => {
    const token = readBearerToken(req)
    if (!token) {
        if (req.accepts('html')) return res.redirect('/login')
        return res.status(401).send({ status: false, msg: 'Authentication required.' })
    }

    try {
        req.auth = verifyTokenValue(token)
        return next()
    } catch {
        if (req.accepts('html')) return res.redirect('/login')
        return res.status(401).send({ status: false, msg: 'Invalid or expired token.' })
    }
}

export const requireRole = (roles) => (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.userType)) {
        return res.status(403).send({ status: false, msg: 'You do not have permission for this resource.' })
    }
    return next()
}

export const requireTenant = (req, res, next) => {
    const requestedClientId = req.params.clientId || req.body?.clientId || req.query?.clientId
    if (requestedClientId && requestedClientId !== req.auth.clientId) {
        return res.status(403).send({ status: false, msg: 'Tenant access denied.' })
    }
    req.tenantId = req.auth.clientId
    return next()
}
