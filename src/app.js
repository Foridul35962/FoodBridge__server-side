import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'


// local imports
import errorHandler from './utils/ErrorHandler.js'


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(cookieParser())

app.use(express.urlencoded({ extended: false }))
app.use(express.json())


app.get('/', (req, res) => {
    res.send('Food Bridge server is running...')
})

//global error handler
app.use(errorHandler)

export default app