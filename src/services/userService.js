import legacyUsers from '../../data/index.js'
import { query, isDatabaseConfigured } from '../config/database.js'
import { comparePassword, hashPassword } from '../helpers/password.js'

export const authenticateUser = async ({ clientId, username, password, userType }) => {
    if (!isDatabaseConfigured) {
        const legacyUser = legacyUsers.find((user) => user.username.toLowerCase() === username.toLowerCase() && user.password === password)
        const requestedRoles = Array.isArray(userType) ? userType : [userType]
        if (!legacyUser || (requestedRoles.includes('ADMIN') && legacyUser.userType !== 'admin')) return null
        return { ...legacyUser, client_id: clientId, user_type: requestedRoles[0], user_id: legacyUser.username }
    }

    const allowedRoles = Array.isArray(userType) ? userType : [userType]
    const placeholders = allowedRoles.map(() => '?').join(', ')
    const rows = await query(`SELECT user_id, client_id, username, password_hash, user_type, first_name, last_name, age, img_url FROM users WHERE client_id = ? AND username = ? AND user_type IN (${placeholders}) LIMIT 1`, [clientId, username, ...allowedRoles])
    const user = rows[0]
    return user && await comparePassword(password, user.password_hash) ? user : null
}

export const listUsers = async (clientId) => {
    if (!isDatabaseConfigured) return legacyUsers.map((user, index) => {
        const { password, ...safeUser } = user
        return { ...safeUser, user_id: index + 1, client_id: clientId, user_type: user.userType === 'admin' ? 'ADMIN' : 'WAITER' }
    })
    return query('SELECT user_id, client_id, username, user_type, first_name, last_name, age, img_url FROM users WHERE client_id = ? ORDER BY username', [clientId])
}

export const createUser = async ({ clientId, username, password, userType, firstName, lastName, age, imgUrl }) => {
    if (!isDatabaseConfigured) {
        const newUser = {
            username,
            password,
            name: [firstName, lastName].filter(Boolean).join(' ') || username,
            designation: userType === 'ADMIN' ? 'Administrator' : 'Staff',
            userType: userType === 'ADMIN' ? 'admin' : 'client',
            client_id: clientId,
            user_type: userType
        }
        legacyUsers.push(newUser)
        const { password: ignoredPassword, ...safeUser } = newUser
        return safeUser
    }
    const passwordHash = await hashPassword(password)
    const result = await query('INSERT INTO users (client_id, username, password_hash, user_type, first_name, last_name, age, img_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [clientId, username, passwordHash, userType, firstName || null, lastName || null, age || null, imgUrl || null])
    return { userId: result.insertId, clientId, username, userType }
}

export const deleteUser = async (clientId, userId) => query('DELETE FROM users WHERE client_id = ? AND user_id = ?', [clientId, userId])

export const updateOwnPassword = async ({ clientId, userId, currentPassword, newPassword }) => {
    if (!isDatabaseConfigured) {
        throw Object.assign(new Error('Database is required to reset passwords.'), { statusCode: 503, expose: true })
    }

    const rows = await query('SELECT password_hash FROM users WHERE client_id = ? AND user_id = ?', [clientId, userId])
    if (!rows[0] || !(await comparePassword(currentPassword, rows[0].password_hash))) return false
    await query('UPDATE users SET password_hash = ? WHERE client_id = ? AND user_id = ?', [await hashPassword(newPassword), clientId, userId])
    return true
}