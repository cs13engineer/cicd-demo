import { pool, query } from '../config/database.js'

export const listOrders = (clientId, status) => {
    const params = [clientId]
    const statusFilter = status ? ' AND o.order_status = ?' : ''
    if (status) params.push(status)
    return query(`SELECT o.order_id, o.client_id, o.table_id, dt.table_number, o.served_by, o.order_status, o.created_at, SUM(oi.quantity * oi.unit_price) AS total FROM orders o JOIN dining_tables dt ON dt.table_id = o.table_id LEFT JOIN order_items oi ON oi.order_id = o.order_id WHERE o.client_id = ?${statusFilter} GROUP BY o.order_id ORDER BY o.created_at DESC`, params)
}

export const createOrder = async (clientId, servedBy, { tableId, items }) => {
    if (!pool) throw Object.assign(new Error('Database is required to create orders.'), { statusCode: 503, expose: true })
    if (!tableId || !Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Select an available table and at least one menu item.'), { statusCode: 400, expose: true })
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const [tableRows] = await connection.execute('SELECT table_id, is_occupied FROM dining_tables WHERE client_id = ? AND table_id = ? FOR UPDATE', [clientId, tableId])
        if (!tableRows[0]) throw Object.assign(new Error('Table not found for this tenant.'), { statusCode: 404, expose: true })
        if (tableRows[0].is_occupied) throw Object.assign(new Error('Select an available table before starting an order.'), { statusCode: 409, expose: true })

        const [orderResult] = await connection.execute('INSERT INTO orders (client_id, table_id, served_by) VALUES (?, ?, ?)', [clientId, tableId, servedBy])
        for (const item of items) {
            const quantity = Number(item.quantity)
            if (!Number.isInteger(quantity) || quantity < 1) throw Object.assign(new Error('Order quantities must be positive whole numbers.'), { statusCode: 400, expose: true })
            const [itemResult] = await connection.execute('INSERT INTO order_items (order_id, item_id, quantity, unit_price) SELECT ?, item_id, ?, price FROM menu_items WHERE client_id = ? AND item_id = ? AND is_available = TRUE', [orderResult.insertId, quantity, clientId, item.itemId])
            if (!itemResult.affectedRows) throw Object.assign(new Error('One or more selected menu items are unavailable.'), { statusCode: 409, expose: true })
        }
        await connection.execute('UPDATE dining_tables SET is_occupied = TRUE WHERE client_id = ? AND table_id = ?', [clientId, tableId])
        await connection.commit()
        return { orderId: orderResult.insertId, clientId, tableId, status: 'PENDING' }
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
}

export const updateOrderStatus = async (clientId, orderId, status) => {
    if (!['PENDING', 'SERVED', 'COMPLETED', 'CANCELLED'].includes(status)) throw Object.assign(new Error('Invalid order status.'), { statusCode: 400, expose: true })
    if (!pool) throw Object.assign(new Error('Database is required to update orders.'), { statusCode: 503, expose: true })
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const [orders] = await connection.execute('SELECT table_id, order_status FROM orders WHERE client_id = ? AND order_id = ? FOR UPDATE', [clientId, orderId])
        if (!orders[0]) throw Object.assign(new Error('Order not found for this tenant.'), { statusCode: 404, expose: true })
        const allowedTransitions = { PENDING: ['SERVED', 'CANCELLED'], SERVED: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] }
        if (status !== orders[0].order_status && !allowedTransitions[orders[0].order_status].includes(status)) throw Object.assign(new Error(`Cannot move an order from ${orders[0].order_status} to ${status}.`), { statusCode: 409, expose: true })
        const [result] = await connection.execute('UPDATE orders SET order_status = ? WHERE client_id = ? AND order_id = ?', [status, clientId, orderId])
        if (['COMPLETED', 'CANCELLED'].includes(status)) await connection.execute('UPDATE dining_tables SET is_occupied = FALSE WHERE client_id = ? AND table_id = ?', [clientId, orders[0].table_id])
        await connection.commit()
        return { order_id: orderId, order_status: status, changed: Boolean(result.affectedRows) }
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
}

export const listDetailedOrders = async (clientId, status = 'ACTIVE', servedBy) => {
    const statusClause = status === 'ACTIVE' ? "AND o.order_status IN ('PENDING', 'SERVED')" : ''
    const servedByClause = servedBy ? ' AND o.served_by = ?' : ''
    const params = servedBy ? [clientId, servedBy] : [clientId]
    const rows = await query(`SELECT o.order_id, o.table_id, dt.table_number, o.served_by, CONCAT_WS(' ', u.first_name, u.last_name) AS served_by_name, o.order_status, o.created_at, oi.item_id, mi.name AS item_name, oi.quantity, oi.unit_price, (oi.quantity * oi.unit_price) AS line_total FROM orders o JOIN dining_tables dt ON dt.table_id = o.table_id AND dt.client_id = o.client_id JOIN users u ON u.user_id = o.served_by AND u.client_id = o.client_id JOIN order_items oi ON oi.order_id = o.order_id JOIN menu_items mi ON mi.item_id = oi.item_id AND mi.client_id = o.client_id WHERE o.client_id = ?${servedByClause} ${statusClause} ORDER BY o.created_at DESC, oi.order_item_id`, params)
    const orders = new Map()
    for (const row of rows) {
        if (!orders.has(row.order_id)) orders.set(row.order_id, { order_id: row.order_id, table_number: row.table_number, served_by: row.served_by, served_by_name: row.served_by_name, order_status: row.order_status, created_at: row.created_at, items: [], total: 0 })
        const order = orders.get(row.order_id)
        order.items.push({ item_id: row.item_id, name: row.item_name, quantity: row.quantity, unit_price: Number(row.unit_price), line_total: Number(row.line_total) })
        order.total += Number(row.line_total)
    }
    return [...orders.values()]
}

export const getDashboardAnalytics = async (clientId) => {
    const [revenue, activeOrders, tables, topItems] = await Promise.all([
        query("SELECT DATE(o.created_at) AS day, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.client_id = ? AND o.order_status <> 'CANCELLED' GROUP BY DATE(o.created_at) ORDER BY day DESC LIMIT 14", [clientId]),
        query("SELECT COUNT(*) AS total FROM orders WHERE client_id = ? AND order_status IN ('PENDING', 'SERVED')", [clientId]),
        query('SELECT SUM(is_occupied = TRUE) AS occupied, SUM(is_occupied = FALSE) AS free FROM dining_tables WHERE client_id = ?', [clientId]),
        query("SELECT mi.name, SUM(oi.quantity) AS quantity, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON o.order_id = oi.order_id AND o.client_id = ? JOIN menu_items mi ON mi.item_id = oi.item_id AND mi.client_id = o.client_id WHERE o.order_status <> 'CANCELLED' GROUP BY mi.item_id, mi.name ORDER BY quantity DESC, revenue DESC LIMIT 5", [clientId])
    ])
    return { revenue: revenue.map((item) => ({ day: item.day, revenue: Number(item.revenue) })), activeOrders: Number(activeOrders[0]?.total || 0), tables: { occupied: Number(tables[0]?.occupied || 0), free: Number(tables[0]?.free || 0) }, topItems: topItems.map((item) => ({ name: item.name, quantity: Number(item.quantity), revenue: Number(item.revenue) })) }
}

export const getWaiterStats = async (clientId, userId) => {
    const [orders, openTables, sales] = await Promise.all([
        query('SELECT COUNT(*) AS total FROM orders WHERE client_id = ? AND served_by = ? AND DATE(created_at) = CURRENT_DATE', [clientId, userId]),
        query("SELECT COUNT(DISTINCT table_id) AS total FROM orders WHERE client_id = ? AND served_by = ? AND order_status IN ('PENDING', 'SERVED')", [clientId, userId]),
        query("SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.client_id = ? AND o.served_by = ? AND o.order_status = 'COMPLETED' AND DATE(o.created_at) = CURRENT_DATE", [clientId, userId])
    ])
    return { ordersToday: Number(orders[0]?.total || 0), activeTables: Number(openTables[0]?.total || 0), salesToday: Number(sales[0]?.total || 0) }
}
