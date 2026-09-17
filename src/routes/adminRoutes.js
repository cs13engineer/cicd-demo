import { Router } from 'express'
import { asyncHandler } from '../helpers/http.js'
import { requireRole, requireTenant, verifyToken } from '../middlewares/auth.js'
import * as controller from '../controllers/resourceController.js'

const router = Router()
router.use(verifyToken, requireTenant, requireRole(['ADMIN']))

router.get('/analytics', asyncHandler(controller.getAdminAnalytics))
router.get('/orders/active', asyncHandler(controller.listAdminOrders))
router.get('/menu', asyncHandler(controller.listMenu))
router.post('/menu', asyncHandler(controller.addMenu))
router.put('/menu/:itemId', asyncHandler(controller.editMenu))
router.delete('/menu/:itemId', asyncHandler(controller.removeMenu))
router.get('/tables', asyncHandler(controller.listTables))
router.post('/tables', asyncHandler(controller.addTable))
router.patch('/tables/:tableId', asyncHandler(controller.editTable))
router.delete('/tables/:tableId', asyncHandler(controller.removeTable))

export default router
