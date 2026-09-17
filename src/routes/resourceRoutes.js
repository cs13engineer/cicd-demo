import { Router } from 'express'
import { asyncHandler } from '../helpers/http.js'
import { requireRole, requireTenant, verifyToken } from '../middlewares/auth.js'
import * as controller from '../controllers/resourceController.js'

const router = Router()
router.use(verifyToken, requireTenant)

router.get('/menu', asyncHandler(controller.listMenu))
router.post('/menu', requireRole(['ADMIN']), asyncHandler(controller.addMenu))
router.put('/menu/:itemId', requireRole(['ADMIN']), asyncHandler(controller.editMenu))
router.delete('/menu/:itemId', requireRole(['ADMIN']), asyncHandler(controller.removeMenu))

router.get('/tables', asyncHandler(controller.listTables))
router.post('/tables', requireRole(['ADMIN']), asyncHandler(controller.addTable))
router.patch('/tables/:tableId', requireRole(['ADMIN', 'WAITER', 'KITCHEN', 'CLIENT']), asyncHandler(controller.editTable))
router.delete('/tables/:tableId', requireRole(['ADMIN']), asyncHandler(controller.removeTable))

router.get('/orders', asyncHandler(controller.listOrders))
router.post('/orders', requireRole(['ADMIN', 'WAITER', 'CLIENT']), asyncHandler(controller.addOrder))
router.patch('/orders/:orderId', requireRole(['ADMIN', 'WAITER', 'KITCHEN', 'CLIENT']), asyncHandler(controller.editOrder))

export default router
