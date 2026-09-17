import { createUser, deleteUser, listUsers } from '../services/userService.js'

export const getUsers = async (req, res) => res.send({ status: true, data: await listUsers(req.tenantId) })

export const addUser = async (req, res) => {
    const userType = String(req.body.userType || '').trim().toUpperCase()
    if (!['WAITER', 'KITCHEN'].includes(userType)) return res.status(400).send({ status: false, msg: 'Staff role must be WAITER or KITCHEN.' })
    if (!req.body.username || !req.body.password || !req.body.firstName || !req.body.lastName || String(req.body.password).length < 8) return res.status(400).send({ status: false, msg: 'Username, password, first name, last name, and an 8-character password are required.' })
    const user = await createUser({ ...req.body, clientId: req.tenantId, userType })
    return res.status(201).send({ status: true, data: user })
}

export const removeUser = async (req, res) => {
    await deleteUser(req.tenantId, req.params.userId)
    return res.send({ status: true, msg: 'User removed successfully.' })
}
