import { Router } from 'express'
import { asyncHandler } from '../helpers/http.js'
import { requireRole, verifyToken } from '../middlewares/auth.js'
import * as controller from '../controllers/resourceController.js'

const router = Router()
router.use(verifyToken, requireRole(['ADMIN']))
router.get('/', asyncHandler(controller.listClients))
router.post('/', asyncHandler(controller.addClient))
router.patch('/:clientId/subscription', asyncHandler(controller.editSubscription))
export default router
