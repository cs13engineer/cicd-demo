import { Router } from 'express'
import { asyncHandler } from '../helpers/http.js'
import { requireRole, requireTenant, verifyToken } from '../middlewares/auth.js'
import * as userController from '../controllers/userController.js'

const router = Router()
router.use(verifyToken, requireTenant)
router.get('/', asyncHandler(userController.getUsers))
router.post('/', requireRole(['ADMIN']), asyncHandler(userController.addUser))
router.delete('/:userId', requireRole(['ADMIN']), asyncHandler(userController.removeUser))
export default router
