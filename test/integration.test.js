import request from 'supertest'
import { expect } from 'chai'
import app from '../src/app.js'
import { isDatabaseConfigured, query } from '../src/config/database.js'

const http = request(app)
const unique = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`

const registerPayload = (suffix = unique()) => ({
    clientName: `Test Restaurant ${suffix}`,
    contactNumber: '9000000000',
    emailId: `test-${suffix}@example.com`,
    username: `admin${suffix}`,
    password: 'AdminPass123!',
    firstName: 'Test',
    lastName: 'Admin'
})

const login = async ({ clientId, username, password, userType = 'ADMIN' }) => {
    const response = await http.post('/auth/login').send({ clientId, username, password, userType })
    expect(response.status).to.equal(200)
    expect(response.body).to.include({ status: true })
    expect(response.headers).to.have.property('set-cookie')
    return response.headers['set-cookie']
}

describe('Authentication and public routes', () => {
    it('serves the landing, login, and registration pages', async () => {
        for (const path of ['/', '/login', '/register']) {
            const response = await http.get(path)
            expect(response.status, path).to.equal(200)
            expect(response.type).to.match(/html|text\/html/)
        }
    })

    it('rejects unknown client IDs', async () => {
        const response = await http.post('/auth/client-id').send({ clientId: 'UNKNOWN-TENANT' })
        expect(response.status).to.equal(401)
        expect(response.body.status).to.equal(false)
    })

    it('rejects malformed login roles', async () => {
        const response = await http.post('/auth/login').send({
            clientId: 'CICD-CLIENT',
            userType: 'SUPERUSER',
            username: 'someone',
            password: 'password'
        })
        expect(response.status).to.equal(400)
    })

    it('redirects anonymous dashboard and reset-password requests to login', async () => {
        for (const path of ['/admin', '/admin/dashboard', '/client', '/client/tables', '/reset-password']) {
            const response = await http.get(path)
            expect(response.status, path).to.equal(302)
            expect(response.headers.location).to.equal('/login')
        }
    })

    it('keeps the legacy user endpoint sanitized', async () => {
        const response = await http.get('/users')
        expect(response.status).to.equal(200)
        expect(response.body.data).to.be.an('array')
        response.body.data.forEach((user) => expect(user).to.not.have.property('password'))
    })
})

describe('Development fallback authentication', () => {
    it('authenticates the demo client user when MySQL is not configured', async function () {
        if (isDatabaseConfigured) this.skip()
        const response = await http.post('/auth/login').send({
            clientId: 'CICD-CLIENT',
            userType: 'WAITER',
            username: 'johnd',
            password: 'johndoe123'
        })
        expect(response.status).to.equal(200)
        expect(response.body.redirectTo).to.equal('/client/tables')
    })
})

describe('MySQL tenant workflow', function () {
    this.timeout(15000)

    let tenantId
    let adminCookie
    let waiterCookie
    let adminUsername
    let waiterUsername
    let tableId
    let menuItemId
    let orderId

    before(async function () {
        if (!isDatabaseConfigured) this.skip()
        const payload = registerPayload()
        adminUsername = payload.username
        const response = await http.post('/auth/register').send(payload)
        expect(response.status).to.equal(201)
        tenantId = response.body.data.clientId
        adminCookie = await login({ clientId: tenantId, username: adminUsername, password: payload.password })
    })

    after(async function () {
        if (!tenantId) return
        await query('DELETE oi FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.client_id = ?', [tenantId])
        await query('DELETE FROM orders WHERE client_id = ?', [tenantId])
        await query('DELETE FROM menu_items WHERE client_id = ?', [tenantId])
        await query('DELETE FROM dining_tables WHERE client_id = ?', [tenantId])
        await query('DELETE FROM users WHERE client_id = ?', [tenantId])
        await query('DELETE FROM payments WHERE client_id = ?', [tenantId])
        await query('DELETE FROM clients WHERE client_id = ?', [tenantId])
    })

    it('creates a client and primary admin in the same onboarding flow', async () => {
        const rows = await query('SELECT c.client_id, c.subscription_status, u.username, u.user_type, u.password_hash FROM clients c JOIN users u ON u.client_id = c.client_id WHERE c.client_id = ?', [tenantId])
        expect(rows).to.have.lengthOf(1)
        expect(rows[0]).to.include({ client_id: tenantId, subscription_status: 'ACTIVE', username: adminUsername, user_type: 'ADMIN' })
        expect(rows[0].password_hash).to.have.length.greaterThan(40)
    })

    it('allows admins to provision a waiter within their tenant', async () => {
        waiterUsername = `waiter${unique()}`
        const response = await http.post('/api/users').set('Cookie', adminCookie).send({
            username: waiterUsername,
            password: 'WaiterPass123!',
            userType: 'WAITER',
            firstName: 'Front',
            lastName: 'Waiter'
        })
        expect(response.status).to.equal(201)
        expect(response.body.data).to.include({ username: waiterUsername, userType: 'WAITER', clientId: tenantId })
        waiterCookie = await login({ clientId: tenantId, username: waiterUsername, password: 'WaiterPass123!', userType: 'WAITER' })
    })

    it('allows admins to create menu items and dining tables', async () => {
        const menu = await http.post('/api/admin/menu').set('Cookie', adminCookie).send({ name: 'Test Curry', price: 14.5, categoryType: 'Mains', isAvailable: true })
        expect(menu.status).to.equal(201)
        menuItemId = menu.body.data.item_id

        const table = await http.post('/api/admin/tables').set('Cookie', adminCookie).send({ tableNumber: `T-${unique()}` })
        expect(table.status).to.equal(201)
        tableId = table.body.data.table_id
    })

    it('restricts menu and table management to admins', async () => {
        const menu = await http.post('/api/admin/menu').set('Cookie', waiterCookie).send({ name: 'Forbidden', price: 1, categoryType: 'Test', isAvailable: true })
        expect(menu.status).to.equal(403)
        const tables = await http.get('/api/tables').set('Cookie', waiterCookie)
        expect(tables.status).to.equal(200)
        expect(tables.body.data.every((table) => table.client_id === tenantId)).to.equal(true)
    })

    it('requires an available table and creates a waiter order with line items', async () => {
        const order = await http.post('/api/orders').set('Cookie', waiterCookie).send({ tableId, items: [{ itemId: menuItemId, quantity: 2 }] })
        expect(order.status).to.equal(201)
        orderId = order.body.data.orderId

        const tables = await query('SELECT is_occupied FROM dining_tables WHERE client_id = ? AND table_id = ?', [tenantId, tableId])
        const items = await query('SELECT quantity, unit_price FROM order_items WHERE order_id = ?', [orderId])
        expect(tables[0].is_occupied).to.equal(1)
        expect(items[0]).to.include({ quantity: 2 })
        expect(Number(items[0].unit_price)).to.equal(14.5)
    })

    it('rejects a second order for an occupied table', async () => {
        const response = await http.post('/api/orders').set('Cookie', waiterCookie).send({ tableId, items: [{ itemId: menuItemId, quantity: 1 }] })
        expect(response.status).to.equal(409)
    })

    it('shows waiter personal stats and itemized history', async () => {
        const stats = await http.get('/api/waiter/stats').set('Cookie', waiterCookie)
        expect(stats.status).to.equal(200)
        expect(stats.body.data).to.include({ ordersToday: 1, activeTables: 1, salesToday: 0 })

        const history = await http.get('/api/waiter/orders/history?status=ALL').set('Cookie', waiterCookie)
        expect(history.status).to.equal(200)
        expect(history.body.data[0].items[0]).to.include({ item_id: menuItemId, quantity: 2, name: 'Test Curry' })
    })

    it('progresses order status and releases the table on completion', async () => {
        const served = await http.patch(`/api/orders/${orderId}`).set('Cookie', waiterCookie).send({ status: 'SERVED' })
        expect(served.status).to.equal(200)
        const completed = await http.patch(`/api/orders/${orderId}`).set('Cookie', waiterCookie).send({ status: 'COMPLETED' })
        expect(completed.status).to.equal(200)

        const tables = await query('SELECT is_occupied FROM dining_tables WHERE client_id = ? AND table_id = ?', [tenantId, tableId])
        expect(tables[0].is_occupied).to.equal(0)
        const stats = await http.get('/api/waiter/stats').set('Cookie', waiterCookie)
        expect(stats.body.data.salesToday).to.equal(29)
    })

    it('returns tenant-scoped admin analytics', async () => {
        const response = await http.get('/api/admin/analytics').set('Cookie', adminCookie)
        expect(response.status).to.equal(200)
        expect(response.body.data).to.have.all.keys('revenue', 'activeOrders', 'tables', 'topItems')
        expect(response.body.data.activeOrders).to.equal(0)
        expect(response.body.data.tables).to.include({ occupied: 0, free: 1 })
    })

    it('resets the authenticated user password', async () => {
        const response = await http.post('/auth/reset-password').set('Cookie', waiterCookie).send({ currentPassword: 'WaiterPass123!', newPassword: 'WaiterNewPass123!' })
        expect(response.status).to.equal(200)
        const relogin = await http.post('/auth/login').send({ clientId: tenantId, userType: 'WAITER', username: waiterUsername, password: 'WaiterNewPass123!' })
        expect(relogin.status).to.equal(200)
    })
})
