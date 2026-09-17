import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import waiterRoutes from './routes/waiterRoutes.js'
import clientRoutes from './routes/clientRoutes.js'
import resourceRoutes from './routes/resourceRoutes.js'
import uiRoutes from './routes/uiRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { asyncHandler } from './helpers/http.js'
import { listUsers as listLegacyUsers } from './controllers/legacyController.js'
import { errorHandler, notFound } from './middlewares/error.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../public')))

app.use('/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/waiter', waiterRoutes)
app.use('/api', resourceRoutes)
app.use('/api/clients', clientRoutes)

// Compatibility endpoint for the original demo client.
app.get('/users', asyncHandler(listLegacyUsers))
app.use(uiRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
