require('dotenv').config()
const jwt = require('jsonwebtoken')
const { io } = require('../http-server.js')

const secretKeyArcade = process.env.TOKEN_SECRET_KEY_ARCADE

io.of('/arcade').use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    jwt.verify(token, secretKeyArcade)
    next()
  } catch (error) {
    console.error('Authentication error', error)
    next(new Error('Authentication error'))
  }
})

io.of('/arcade').on('connection', (socket) => {
  socket.on('stateUpdate', (state) => {
    console.log('Socket ' + socket.id + ': ' + JSON.stringify(state))
  })
})
