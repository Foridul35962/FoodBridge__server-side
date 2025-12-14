import app from "./src/app.js";
import connectDb from "./src/config/db.js";
import dotEnv from 'dotenv'
dotEnv.config()

const PORT = process.env.PORT

connectDb().then(() => {
    app.listen(PORT, () => {
        console.log(`server is running on http://localhost:${PORT}`);
    })
}).catch(() => {
    console.log('server connection failed');
})