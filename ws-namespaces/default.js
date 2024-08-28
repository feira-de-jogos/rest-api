const { io } = require('../http-server.js')

io.of('/').use(async (socket, next) => {
  socket.disconnect()
})
