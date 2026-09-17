import { Router } from 'express'
import { asyncHandler } from '../helpers/http.js'
import { requireRole, requireTenant, verifyToken } from '../middlewares/auth.js'
import * as controller from '../controllers/resourceController.js'

const router = Router()
router.use(verifyToken, requireTenant, requireRole(['ADMIN', 'WAITER']))

router.get('/stats', asyncHandler(controller.getWaiterStats))
router.get('/orders/history', asyncHandler(controller.listWaiterOrders))

export default router