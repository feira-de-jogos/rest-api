require('dotenv').config()
const { app, httpServer, io } = require('./http-server.js')
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const jwt = require('jsonwebtoken')
const db = require('./db.js')

const audience = process.env.GOOGLE_CLIENT_ID
const port = process.env.PORT || 3000

const postLogin = require('./routes/postLogin')
const postTransfer = require('./routes/postTransfer')
const postDebit = require('./routes/postDebit')
const postCredit = require('./routes/postCredit')
const getBalance = require('./routes/getBalance')
const getGames = require('./routes/getGames')
const getStatement = require('./routes/getStatement')
const getProducts = require('./routes/getProducts')

// Express routes
app.use('/api/v2', postLogin)
app.use('/api/v2', postTransfer)
app.use('/api/v2', postDebit)
app.use('/api/v2', postCredit)
app.use('/api/v2', getBalance)
app.use('/api/v2', getGames)
app.use('/api/v2', getStatement)
app.use('/api/v2', getProducts)

// WebSocket namespaces
require('./ws-namespaces/default.js')
require('./ws-namespaces/vending-machine.js')
require('./ws-namespaces/arcade.js')
require('./ws-namespaces/api-v2-machine.js')

httpServer.listen(port, () => { console.log('Server running!') })
