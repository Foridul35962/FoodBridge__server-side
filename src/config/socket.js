import Users from "../models/Users.model.js"

export const socketHandler = (io)=>{
    io.on('connection', (socket)=>{
        socket.on('identity', async({userId})=>{
            try {
                const user = await Users.findByIdAndUpdate(userId, {
                    socketId: socket.id,
                    isOnline: true
                }, {new: true})
                socket.join(userId)
            } catch (error) {
                console.log(error)
            }
        })

        socket.on('updateLocation', async ({latitude, longitude, userId})=>{
            try {
                const user = await Users.findByIdAndUpdate(userId, {
                    location:{
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    isOnline: true,
                    socketId: socket.id
                })

                if (user) {
                    io.emit('updateDeliveryLocation',{
                        deliveryBoyId: userId,
                        latitude,
                        longitude
                    })
                }
            } catch (error) {
                console.log(error)
            }
        })

        socket.on('disconnect', async()=>{
            try {
                await Users.findOneAndUpdate({socketId: socket.id},
                    {
                        socketId: null,
                        isOnline: false
                    }
                )
            } catch (error) {
                console.log(error)
            }
        })
    })
}