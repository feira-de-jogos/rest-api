const { io } = require('../http-server.js')

io.of('/').use(async (socket, next) => {
  // Disconnect unauthorized clients
  socket.disconnect()
})
