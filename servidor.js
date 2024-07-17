require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { path: '/api/v2/machine/' })
const port = process.env.PORT || 3000
const jwt = require('jsonwebtoken')
const secretKeyVendingMachine = process.env.TOKEN_SECRET_KEY_VENDING_MACHINE
const secretKeyArcade = process.env.TOKEN_SECRET_KEY_ARCADE

const postLogin = require('./routes/postLogin')
const postTransfer = require('./routes/postTransfer')
const getBalance = require('./routes/getBalance')
const getGames = require('./routes/getGames')
const getStatement = require('./routes/getStatement')
const getProducts = require('./routes/getProducts')

app.use(cors({
  origin: [/feira-de-jogos\.dev\.br$/],
  methods: 'POST'
}))
app.use(express.json())

app.use('/api/v2', postLogin)
app.use('/api/v2', postTransfer)
app.use('/api/v2', getBalance)
app.use('/api/v2', getGames)
app.use('/api/v2', getStatement)
app.use('/api/v2', getProducts)

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
  socket.on('state', (state) => {
    console.log('Socket ' + socket.id + ': ' + state)
  })

  socket.on('disconnect', () => { })
})

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
  socket.on('state', (state) => {
    console.log('Socket ' + socket.id + ': ' + state)
  })

  socket.on('disconnect', () => { })
})

httpServer.listen(port, () => { console.log('Server running!') })
