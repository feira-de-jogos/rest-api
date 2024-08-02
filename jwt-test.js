require('dotenv').config()
const jwt = require('jsonwebtoken')
const io = require('socket.io-client')

const secretKey = process.env.TOKEN_SECRET_KEY_ARCADE
const payload = { machine: 'arcade', id: 0 }
const token = jwt.sign(payload, secretKey, { expiresIn: '365d' })
const socket = io('https://feira-de-jogos.dev.br/arcade', { path: '/api/v2/machine', auth: { token } })

socket.on('connect', () => {
  console.log('Connected')
  socket.emit('stateUpdate', 'idle')
})

socket.on('disconnect', () => {
  console.log('Disconnected')
})
