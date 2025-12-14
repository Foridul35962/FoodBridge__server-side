import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(cookieParser())

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// local routes


app.get('/', (req, res) => {
    res.send('Food Bridge server is running...')
})



export default app