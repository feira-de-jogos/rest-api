const jwt = require('jsonwebtoken')
const { io } = require('../http-server.js')
const db = require('../db.js')

const signToken = db.query('SELECT "token" FROM "machines" WHERE "name" like \'vending-machine%\' LIMIT 1;')
const secretKeyVendingMachine = process.env.TOKEN_SECRET_KEY_VENDING_MACHINE || signToken.rows[0].id

io.of('/api/v2/machine').use(async (socket, next) => {
  // Validar token a partir do aplicativo Unity
  try {
    const token = socket.handshake.auth.token
    const jwtDecoded = jwt.verify(token, secretKeyVendingMachine)
    console.log(jwtDecoded)
    next()
  } catch (error) {
    console.error('Authentication error', error)
    next(new Error('Authentication error'))
  }

  // Testes na unity

  // -------------------------

  socket.emit('state', 'mfa');
  let jsonObject = {
    "userName": "Leo",
    "mfa": 18
  };
  let jsonString = JSON.stringify(jsonObject);
  socket.emit('showMfa', jsonObject);


  socket.on('getDebit', async (data) => {
    const debitSchema = Joi.object({
      operation: Joi.number().integer().required(),
    });
    const { error } = debitSchema.validate(data);
    if (error) {
      console.log('Erro')
      return
    }

    const { to } = data;
    console.log(to);
  })

  // --------------------------



  /*socket.on('reciveMfa', async (data) => {
    if (!authenticated) {
      socket.emit('debit', '401');
      return
    }
    if (data != mfa) {
      socket.emit('debit', '403');
      return
    }
    socket.emit('state', 'releasing');
  })*/

})


// io.of('/vending-machine').broadcast.emit(...)

io.of('/api/v2/machine').on('connection', async (socket) => { })
