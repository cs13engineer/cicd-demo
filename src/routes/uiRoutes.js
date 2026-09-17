import { Router } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireRole, verifyToken } from '../middlewares/auth.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const template = (name) => path.join(__dirname, '../../templates', name)

router.get('/', (req, res) => res.sendFile(template('client-id.html')))
router.get('/login', (req, res) => res.sendFile(template('login.html')))
router.get('/register', (req, res) => res.sendFile(template('register.html')))
router.get('/reset-password', verifyToken, (req, res) => res.sendFile(template('reset-password.html')))
const dashboardAccess = (req, res, next) => {
	const roles = req.path.startsWith('/admin') ? ['ADMIN'] : ['WAITER', 'KITCHEN', 'CLIENT']
	return requireRole(roles)(req, res, next)
}

router.get(['/admin', '/admin/dashboard'], verifyToken, dashboardAccess, (req, res) => res.sendFile(template('admin/dashboard.html')))
router.get(['/client', '/client/tables', '/client/orders'], verifyToken, dashboardAccess, (req, res) => res.sendFile(template('client/dashboard.html')))
router.get(['/client/user-details', '/admin/user-details'], verifyToken, dashboardAccess, (req, res) => res.sendFile(template('user-details.html')))

export default router
