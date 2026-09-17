import { query } from '../config/database.js'

export const listTables = (clientId) => query('SELECT table_id, client_id, table_number, is_occupied FROM dining_tables WHERE client_id = ? ORDER BY table_number', [clientId])

export const createTable = async (clientId, tableNumber) => {
    if (!String(tableNumber || '').trim()) throw Object.assign(new Error('Table number is required.'), { statusCode: 400, expose: true })
    const result = await query('INSERT INTO dining_tables (client_id, table_number) VALUES (?, ?)', [clientId, tableNumber])
    return { table_id: result.insertId, client_id: clientId, table_number: tableNumber, is_occupied: false }
}

export const updateTableStatus = async (clientId, tableId, isOccupied) => {
    const result = await query('UPDATE dining_tables SET is_occupied = ? WHERE client_id = ? AND table_id = ?', [Boolean(isOccupied), clientId, tableId])
    if (!result.affectedRows) throw Object.assign(new Error('Dining table not found.'), { statusCode: 404, expose: true })
    return { table_id: tableId, is_occupied: Boolean(isOccupied) }
}

export const deleteTable = async (clientId, tableId) => {
    const result = await query('DELETE FROM dining_tables WHERE client_id = ? AND table_id = ?', [clientId, tableId])
    if (!result.affectedRows) throw Object.assign(new Error('Dining table not found.'), { statusCode: 404, expose: true })
    return { table_id: tableId, deleted: true }
}
