require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createServer } = require("http")
const { Server } = require("socket.io")
const port = process.env.PORT || 3000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { path: "/api/v2/machine/" })

const postLogin = require('./routes/postLogin')

app.use(cors({
  origin: [
    /postman\.co$/,
    /github\.dev$/,
    /feira-de-jogos\.dev\.br$/
  ],
  methods: 'POST'
}))
app.use(express.urlencoded({ extended: true }))

app.use('/api/v2', postLogin)

io.of('/vending-machine').on('connection', (socket) => {
  socket.on('disconnect', () => { })
})

io.of('/arcade').on('connection', (socket) => {
  console.log("Socket: " + socket.id)

  socket.on('state', (state) => {
    console.log("Socket " + socket.id + ": " + state)
  })

  socket.on('disconnect', () => { })
})

httpServer.listen(port, () => { console.log('Server running!') })
