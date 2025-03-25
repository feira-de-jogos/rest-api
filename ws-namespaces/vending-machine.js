const jwt = require('jsonwebtoken')
const { ioMachine } = require('../http-server.js')
const Joi = require('joi')
const db = require('../db.js')

const signToken = db.query('SELECT "token" FROM "machines" WHERE "name" like \'vending-machine-%\' LIMIT 1;')
const secretKeyVendingMachine = process.env.TOKEN_SECRET_KEY_VENDING_MACHINE || signToken.rows[0].token

const stateUpdateSchema = Joi.object({
  state: Joi.string().required(),
  operation: Joi.number().integer().positive().allow(0).required()
})

ioMachine.of('/vending-machine').use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    jwt.verify(token, secretKeyVendingMachine)
    next()
  } catch (error) {
    console.error('Authentication error', error)
    next(new Error('Authentication error'))
  }
})

ioMachine.of('/vending-machine').on('connection', async (socket) => {
  socket.on('stateUpdate', async (data) => {
    const { error } = stateUpdateSchema.validate(data)
    if (error) {
      console.log(error)
      return
    }

    const { state, operation } = data
    ioMachine.of('/vending-machine').emit('stateUpdate', data)
    if (state === 'idle') {
      await db.query('UPDATE "machines" SET "busy" = false WHERE "name" = (SELECT "name" FROM "machines" WHERE "name" LIKE \'vending-machine%\' LIMIT 1);', (err) => {
        if (err) {
          console.error(err)
          return
        }
        console.log('Machine state updated to idle')
      })

      // Operation = 0 is reserved for vending machine setup
      // Operation > 0 is a product release operation
      if (operation > 0) {
        let product = await db.query('SELECT "product" as "id" FROM "operations" WHERE "id" = $1', [operation], (err) => {
          if (err) {
            console.error(err)
            return
          }
        })

        await db.query('UPDATE "stock" SET "quantity" = "quantity" - 1 WHERE "product" = $1;', [product.rows[0].id], (err) => {
          if (err) {
            console.error(err)
            return
          }
          console.log(`Product released: operation ${operation}`)
        })

        await db.query('UPDATE "operations" set "completed" = true WHERE "id" = $1;', [operation], (err) => {
          if (err) {
            console.error(err)
            return
          }
          console.log(`Operation updated: operation ${operation}`)
        })
      }
    } else if (state === 'mfa') {
      await db.query('UPDATE "machines" SET "busy" = true WHERE "name" = (SELECT "name" FROM "machines" WHERE "name" LIKE \'vending-machine%\' LIMIT 1);', (err) => {
        if (err) {
          console.error(err)
          return
        }
        console.log('Machine state updated to busy (MFA)')
      })
    } else if (state === 'releasing') {
      await db.query('UPDATE "machines" SET "busy" = true WHERE "name" = (SELECT "name" FROM "machines" WHERE "name" LIKE \'vending-machine%\' LIMIT 1);', (err) => {
        if (err) {
          console.error(err)
          return
        }
        console.log('Machine state updated to busy (releasing)')
      })
    }
  })
})
