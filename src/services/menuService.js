import { query } from '../config/database.js'

export const listMenuItems = (clientId) => query('SELECT item_id, client_id, name, price, category_type, is_available FROM menu_items WHERE client_id = ? ORDER BY category_type, name', [clientId])

export const createMenuItem = async (clientId, { name, price, categoryType, isAvailable = true }) => {
    if (!String(name || '').trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
        throw Object.assign(new Error('Name and a non-negative price are required.'), { statusCode: 400, expose: true })
    }
    const result = await query('INSERT INTO menu_items (client_id, name, price, category_type, is_available) VALUES (?, ?, ?, ?, ?)', [clientId, name, price, categoryType || null, isAvailable])
    return { item_id: result.insertId, client_id: clientId, name, price: Number(price), category_type: categoryType || null, is_available: Boolean(isAvailable) }
}

export const updateMenuItem = async (clientId, itemId, { name, price, categoryType, isAvailable }) => {
    if (!String(name || '').trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
        throw Object.assign(new Error('Name and a non-negative price are required.'), { statusCode: 400, expose: true })
    }
    const result = await query('UPDATE menu_items SET name = ?, price = ?, category_type = ?, is_available = ? WHERE client_id = ? AND item_id = ?', [name, price, categoryType || null, Boolean(isAvailable), clientId, itemId])
    if (!result.affectedRows) throw Object.assign(new Error('Menu item not found.'), { statusCode: 404, expose: true })
    return { item_id: itemId, client_id: clientId, name, price: Number(price), category_type: categoryType || null, is_available: Boolean(isAvailable) }
}

export const deleteMenuItem = async (clientId, itemId) => {
    const result = await query('DELETE FROM menu_items WHERE client_id = ? AND item_id = ?', [clientId, itemId])
    if (!result.affectedRows) throw Object.assign(new Error('Menu item not found.'), { statusCode: 404, expose: true })
    return { item_id: itemId, deleted: true }
}
