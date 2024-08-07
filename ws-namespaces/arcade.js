const jwt = require('jsonwebtoken')
const { io } = require('../http-server.js')
const Joi = require('joi')
const db = require('../db.js')

const signToken = db.query('SELECT "token" FROM "machines" WHERE "name" like \'arcade-%\' LIMIT 1;')
const secretKeyArcade = process.env.TOKEN_SECRET_KEY_ARCADE || signToken.rows[0].id

const coinInsertedSchema = Joi.object({
  arcade: Joi.number().integer().positive().allow(0).required(),
  operation: Joi.number().integer().positive().allow(0).required()
});

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
  // Código de teste:
  io.of('/arcade').emit('coinInsert', { arcade: 0, coins: 1, operation: 0 })

  socket.on('coinInserted', (data) => {
    const { error } = coinInsertedSchema.validate(data)
    if (error) {
      console.log(error)
      return
    }
    console.log('coinInserted', data)

    const { arcade, operation } = data
    // Debitar as moedas do saldo do usuário

    // Código de teste:
    io.of('/arcade').emit('coinInsert', { arcade, coins: 1, operation })
  })
})
