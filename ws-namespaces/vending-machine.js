require('dotenv').config()
const jwt = require('jsonwebtoken')
const { io } = require('../http-server.js')

const secretKeyVendingMachine = process.env.TOKEN_SECRET_KEY_VENDING_MACHINE

io.of('/vending-machine').use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    jwt.verify(token, secretKeyVendingMachine)
    next()
  } catch (error) {
    console.error('Authentication error', error)
    next(new Error('Authentication error'))
  }
})

io.of('/vending-machine').on('connection', (socket) => {
  console.log('Connected', socket.id)
  socket.on('stateUpdate', (state) => {
    console.log('Socket ' + socket.id + ': ' + JSON.stringify(state))
  })
})
