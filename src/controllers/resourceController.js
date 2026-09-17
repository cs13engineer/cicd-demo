import * as menuService from '../services/menuService.js'
import * as tableService from '../services/tableService.js'
import * as orderService from '../services/orderService.js'
import * as clientService from '../services/clientService.js'

export const listMenu = async (req, res) => res.send({ status: true, data: await menuService.listMenuItems(req.tenantId) })
export const addMenu = async (req, res) => res.status(201).send({ status: true, data: await menuService.createMenuItem(req.tenantId, req.body) })
export const editMenu = async (req, res) => res.send({ status: true, data: await menuService.updateMenuItem(req.tenantId, req.params.itemId, req.body) })
export const removeMenu = async (req, res) => res.send({ status: true, data: await menuService.deleteMenuItem(req.tenantId, req.params.itemId) })

export const listTables = async (req, res) => res.send({ status: true, data: await tableService.listTables(req.tenantId) })
export const addTable = async (req, res) => res.status(201).send({ status: true, data: await tableService.createTable(req.tenantId, req.body.tableNumber) })
export const editTable = async (req, res) => res.send({ status: true, data: await tableService.updateTableStatus(req.tenantId, req.params.tableId, req.body.isOccupied) })
export const removeTable = async (req, res) => res.send({ status: true, data: await tableService.deleteTable(req.tenantId, req.params.tableId) })

export const listOrders = async (req, res) => res.send({ status: true, data: await orderService.listOrders(req.tenantId, req.query.status) })
export const addOrder = async (req, res) => res.status(201).send({ status: true, data: await orderService.createOrder(req.tenantId, req.auth.userId, req.body) })
export const editOrder = async (req, res) => res.send({ status: true, data: await orderService.updateOrderStatus(req.tenantId, req.params.orderId, req.body.status) })

export const listWaiterOrders = async (req, res) => res.send({ status: true, data: await orderService.listDetailedOrders(req.tenantId, req.query.status || 'ALL', req.auth.userId) })
export const getWaiterStats = async (req, res) => res.send({ status: true, data: await orderService.getWaiterStats(req.tenantId, req.auth.userId) })

export const listAdminOrders = async (req, res) => res.send({ status: true, data: await orderService.listDetailedOrders(req.tenantId, req.query.status || 'ACTIVE') })
export const getAdminAnalytics = async (req, res) => res.send({ status: true, data: await orderService.getDashboardAnalytics(req.tenantId) })

export const listClients = async (req, res) => res.send({ status: true, data: await clientService.listClients() })
export const addClient = async (req, res) => res.status(201).send({ status: true, data: await clientService.createClient(req.body) })
export const editSubscription = async (req, res) => res.send({ status: true, data: await clientService.updateSubscription(req.params.clientId, req.body.subscriptionStatus) })
