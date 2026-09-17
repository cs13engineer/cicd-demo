import { Router } from 'express'
import { asyncHandler } from '../helpers/http.js'
import * as authController from '../controllers/authController.js'
import { verifyToken } from '../middlewares/auth.js'

const router = Router()
router.post('/client-id', asyncHandler(authController.validateClient))
router.post('/login', asyncHandler(authController.login))
router.post('/register', asyncHandler(authController.register))
router.post('/reset-password', verifyToken, asyncHandler(authController.resetPassword))
export default router
