import 'dotenv/config'
import mysql from 'mysql2/promise'

const requiredDatabaseConfig = ['DB_HOST', 'DB_USER', 'DB_NAME']
const hasDatabaseConfig = requiredDatabaseConfig.every((key) => process.env[key])

export const pool = hasDatabaseConfig
    ? mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
        queueLimit: 0
    })
    : null

export const isDatabaseConfigured = hasDatabaseConfig

export const query = async (sql, params = []) => {
    if (!pool) {
        throw new Error('Database is not configured. Set DB_HOST, DB_USER, and DB_NAME.')
    }

    const [rows] = await pool.execute(sql, params)
    return rows
}
