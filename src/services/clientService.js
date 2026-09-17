import { randomUUID } from 'crypto'
import { pool, query, isDatabaseConfigured } from '../config/database.js'
import { hashPassword } from '../helpers/password.js'

export const findClient = async (clientId) => {
    if (!isDatabaseConfigured) return { client_id: clientId, client_name: 'Development Restaurant', subscription_status: 'ACTIVE' }
    const rows = await query('SELECT client_id, client_name, subscription_status, validity_date FROM clients LEFT JOIN payments USING (client_id) WHERE client_id = ? ORDER BY validity_date DESC LIMIT 1', [clientId])
    return rows[0] || null
}

export const listClients = async () => query('SELECT client_id, client_name, contact_number, email_id, subscription_status, created_at FROM clients ORDER BY created_at DESC')

export const createClient = async ({ clientId, clientName, contactNumber, emailId }) => {
    await query('INSERT INTO clients (client_id, client_name, contact_number, email_id) VALUES (?, ?, ?, ?)', [clientId, clientName, contactNumber || null, emailId])
    return findClient(clientId)
}

export const updateSubscription = async (clientId, subscriptionStatus) => {
    await query('UPDATE clients SET subscription_status = ? WHERE client_id = ?', [subscriptionStatus, clientId])
    return findClient(clientId)
}

export const onboardClientWithAdmin = async ({ clientName, contactNumber, emailId, username, password, firstName, lastName }) => {
    if (!pool) {
        throw Object.assign(new Error('Database is required for restaurant onboarding.'), { statusCode: 503, expose: true })
    }

    const clientId = `REST-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
    const passwordHash = await hashPassword(password)
    const connection = await pool.getConnection()

    try {
        await connection.beginTransaction()
        await connection.execute('INSERT INTO clients (client_id, client_name, contact_number, email_id, subscription_status) VALUES (?, ?, ?, ?, ?)', [clientId, clientName, contactNumber || null, emailId, 'ACTIVE'])
        const [userResult] = await connection.execute('INSERT INTO users (client_id, username, password_hash, user_type, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)', [clientId, username, passwordHash, 'ADMIN', firstName, lastName])
        await connection.commit()
        return { clientId, userId: userResult.insertId, username, userType: 'ADMIN' }
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
}
