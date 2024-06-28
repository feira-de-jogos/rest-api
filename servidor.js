require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const port = process.env.PORT || 3000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { path: '/api/v2/machine/' })

const postLogin = require('./routes/postLogin')
const getBalance = require('./routes/getBalance')
const getGames = require('./routes/getGames')

app.use(cors({
  origin: [/feira-de-jogos\.dev\.br$/],
  methods: 'POST'
}))
app.use(express.json())

app.use('/api/v2', postLogin)
app.use('/api/v2', getBalance)
app.use('/api/v2', getGames)

io.of('/vending-machine').on('connection', (socket) => {
  socket.on('disconnect', () => { })
})

io.of('/arcade').on('connection', (socket) => {
  console.log('Socket: ' + socket.id)

  socket.on('state', (state) => {
    console.log('Socket ' + socket.id + ': ' + state)
  })

  socket.on('disconnect', () => { })
})

httpServer.listen(port, () => { console.log('Server running!') })
