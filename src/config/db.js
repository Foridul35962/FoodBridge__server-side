import mongoose from 'mongoose'

const connectDb = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/foodbridge`).then(() => {
            console.log('database is connected');
        })
    } catch (error) {
        console.log('database connection failed', error);
    }
}

export default connectDb