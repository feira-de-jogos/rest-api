const jwt = require('jsonwebtoken')
const { io } = require('../http-server.js')
const Joi = require('joi');
const db = require('../db.js')

const secretKeyVendingMachine = process.env.TOKEN_SECRET_KEY_VENDING_MACHINE

const stateUpdateSchema = Joi.object({
  state: Joi.string().required(),
  operation: Joi.number().integer().positive().allow(0).required()
});

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
  socket.on('stateUpdate', (data) => {
    const { error } = stateUpdateSchema.validate(data)
    if (error) {
      console.log(error)
      return
    }

    const { state, operation } = data
    if (state === 'idle') {
      db.query('UPDATE "machines" SET "busy" = false WHERE "name" = (SELECT "name" FROM "machines" WHERE "name" LIKE \'vending-machine%\' LIMIT 1);', (err) => {
        if (err) {
          console.error(err)
          return
        }
        console.log('Machine state updated to idle')
      })

      // Operation = 0 is reserved for vending machine setup
      // Operation > 0 is a product release operation
      if (operation > 0) {
        db.query('UPDATE "stock" SET "quantity" = $1 WHERE "id" = $2;', [quantity - 1, id], (err, result) => {
          if (err) {
            console.error(err)
            return res.sendStatus(500)
          }
          console.log(`Product released: operation ${operation}`)

          db.query('UPDATE "operations" set "completed" = true WHERE "id" = $1;', [operation], (err) => {
            if (err) {
              console.error(err)
              return
            }
            console.log(`Operation updated: operation ${operation}`)
          })
        })

      }

    } else if (state === 'mfa') {
      db.query('UPDATE "machines" SET "busy" = true WHERE "name" = (SELECT "name" FROM "machines" WHERE "name" LIKE \'vending-machine%\' LIMIT 1);', (err) => {
        if (err) {
          console.error(err)
          return
        }
        console.log('Machine state updated to busy (MFA)')
      })
    } else if (state === 'releasing') {
      db.query('UPDATE "machines" SET "busy" = true WHERE "name" = (SELECT "name" FROM "machines" WHERE "name" LIKE \'vending-machine%\' LIMIT 1);', (err) => {
        if (err) {
          console.error(err)
          return
        }
        console.log('Machine state updated to busy (releasing)')
      })
    }
  })
})
