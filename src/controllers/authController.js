import { findClient, onboardClientWithAdmin } from '../services/clientService.js'
import { authenticateUser, createUser, updateOwnPassword } from '../services/userService.js'
import { createToken } from '../helpers/token.js'
import { normalizeUserType, publicUser } from '../helpers/http.js'

const roleToDatabaseTypes = { ADMIN: ['ADMIN'], WAITER: ['WAITER'], KITCHEN: ['KITCHEN'], CLIENT: ['WAITER'] }

export const validateClient = async (req, res) => {
    const clientId = String(req.body?.clientId || '').trim().toUpperCase()
    const client = await findClient(clientId)
    if (!client || client.subscription_status !== 'ACTIVE') return res.status(401).send({ status: false, msg: 'Client ID was not recognized or is inactive.' })
    return res.send({ status: true, clientId, client: { clientId: client.client_id, name: client.client_name } })
}

export const login = async (req, res) => {
    const clientId = String(req.body?.clientId || '').trim().toUpperCase()
    const userType = normalizeUserType(req.body?.userType)
    const dbUserTypes = roleToDatabaseTypes[userType]
    if (!dbUserTypes) return res.status(400).send({ status: false, msg: 'User type must be ADMIN, WAITER, or KITCHEN.' })

    const user = await authenticateUser({ clientId, username: String(req.body?.username || '').trim(), password: String(req.body?.password || ''), userType: dbUserTypes })
    if (!user) return res.status(401).send({ status: false, msg: 'Username or password is incorrect.' })

    const token = createToken({ userId: user.user_id, username: user.username, clientId, userType })
    res.setHeader('Set-Cookie', `restaurant_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${8 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
    return res.send({ status: true, user: publicUser(user), token, redirectTo: userType === 'ADMIN' ? '/admin/dashboard' : '/client/tables' })
}

export const register = async (req, res) => {
    const required = ['clientName', 'emailId', 'username', 'password', 'firstName', 'lastName']
    if (required.some((field) => !String(req.body?.[field] || '').trim())) return res.status(400).send({ status: false, msg: 'Restaurant and primary admin fields are required.' })
    if (!/^\S+@\S+\.\S+$/.test(String(req.body.emailId).trim()) || String(req.body.password).length < 8) return res.status(400).send({ status: false, msg: 'Use a valid email and a password of at least 8 characters.' })
    const result = await onboardClientWithAdmin({
        clientName: String(req.body.clientName).trim(),
        contactNumber: String(req.body.contactNumber || '').trim(),
        emailId: String(req.body.emailId).trim().toLowerCase(),
        username: String(req.body.username).trim(),
        password: String(req.body.password),
        firstName: String(req.body.firstName).trim(),
        lastName: String(req.body.lastName).trim()
    })
    return res.status(201).send({ status: true, data: result })
}

export const resetPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword || String(newPassword).length < 8) return res.status(400).send({ status: false, msg: 'Current password and a new password of at least 8 characters are required.' })
    const updated = await updateOwnPassword({ clientId: req.auth.clientId, userId: req.auth.userId, currentPassword, newPassword })
    if (!updated) return res.status(401).send({ status: false, msg: 'Current password is incorrect.' })
    return res.send({ status: true, msg: 'Password updated successfully.' })
}
