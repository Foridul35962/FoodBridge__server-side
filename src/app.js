import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'


// local imports
import errorHandler from './utils/ErrorHandler.js'
import authRouter from './routes/auth.routes.js'
import shopRouter from './routes/shop.routes.js'
import itemRouter from './routes/item.routes.js'
import orderRouter from './routes/order.routes.js'
import deliveryRouter from './routes/delivery.routes.js'


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(cookieParser())

app.use(express.urlencoded({ extended: false }))
app.use(express.json())


//routes
app.use('/api/auth', authRouter)
app.use('/api/shop', shopRouter)
app.use('/api/item', itemRouter)
app.use('/api/order', orderRouter)
app.use('/api/delivery', deliveryRouter)

app.get('/', (req, res) => {
    res.send('Food Bridge server is running...')
})

//global error handler
app.use(errorHandler)

export default app