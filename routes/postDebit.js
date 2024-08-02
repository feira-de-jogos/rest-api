const { io } = require('../http-server.js')
const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const Joi = require('joi');
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID
const db = require('../db.js')

const transferSchema = Joi.object({
  machine: Joi.number().integer().required(),
  product: Joi.number().integer().required(),
});

router.post('/debit', async (req, res) => {
  let payload
  let email

  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.token
    })
    payload = ticket.getPayload()
    email = payload.email
  } catch (err) {
    console.error(err)
    return res.sendStatus(401)
  }

  try {
    const { error } = transferSchema.validate(req.body);
    if (error) {
      return res.status(400).send({ error: error.details[0].message });
    }

    const auth = await db.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }
    const userId = auth.rows[0].id
    const { machine, product } = req.body;

    // Código a seguir não alinhado com o fluxo definido:
    // https://github.com/feira-de-jogos/docs/tree/main/v2#operação-de-débito

    // Verifica se a maquina existe
    const machineSearch = await db.query('SELECT * from machines where "id" = $1', [machine])
    if (machineSearch.rowCount === 0) {
      return res.sendStatus(403)
    }

    // Verifica se o produto existe e se ele pode ser comprado por arcade/vending-machine
    const productSearch = await db.query('SELECT type FROM products WHERE id = $1 AND (type = 2 OR type = 4);', [product])
    if (productSearch.rowCount === 0) {
      return res.sendStatus(403)
    }
    const machineType = productSearch.rows[0].type

    // Verifica se o usu�rio tem dinheiro para comprar o produto

    const valueProductSearch = await db.query('SELECT price FROM products WHERE id = $1;', [product])
    productValue = valueProductSearch.rows[0].price;

    let expenses = await db.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "from" = $1 and "completed" = true', [userId])
    expenses = parseInt(expenses.rows[0].sum)

    let revenues = await db.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "to" = $1 and "completed" = true', [userId])
    revenues = parseInt(revenues.rows[0].sum)

    let BalanceValue = revenues - expenses;

    if (productValue > BalanceValue) {
      return res.sendStatus(402)
    }


    // Verifica se a m�quina esta ocupada
    const machineBusySearch = await db.query('SELECT busy from machines WHERE id = $1', [machine])
    if (machineBusySearch.busy == 't') {
      return res.sendStatus(403)
    }


    // Verifica se o produto � da vending machine 
    if (machineType == 2) {
      // Verifica se esta em estoque
      const stockSearch = await db.query('SELECT quantity FROM stock WHERE machine = $1 AND product = $2;', [machine, product])
      if (stockSearch.rowCount === 0 || stockSearch.rows[0].quantity == 0) {
        return res.sendStatus(403)
      }


      // Maquina fica ocupada
      const updateMachineStatus = await db.query('UPDATE machines SET busy = \'t\' WHERE id = $1 ', [machine])
      // Gera o Mfa
      mfa = Math.floor(Math.random() * (99 - 11 + 1)) + 11;
      //Insere a opera��o de d�bito
      const insertResult = await db.query('INSERT INTO "operations"("from", "to", "product", "value", "date", "mfa", "completed") VALUES($1, 1, $2, $3, NOW(), $4, false) RETURNING id', [userId, product, productValue, mfa])
      var operationId = insertResult.rows[0].id;
      //Forma o json para mandar para o webSocket
      let jsonObject = {
        "operation": operationId,
      };
      let jsonString = JSON.stringify(jsonObject);
      //Manda o MFA para unity
      io.to('machine').emit('purchase', jsonString)
    }

    if (machineType == 4) {
      // Maquina fica ocupada
      // const updateMachineStatus = await db.query('UPDATE machines SET busy = \'t\' WHERE id = $1 ', [machine])
      // Insere a opera��o de d�bito
      const insertResult = await db.query('INSERT INTO "operations"("from", "to", "product", "value", "date", "completed") VALUES($1, 1, $2, $3, NOW(), false) RETURNING id', [userId, product, productValue])
      var operationId = insertResult.rows[0].id;
      // io.of('/vending-machine').emit(...)
      
    }

    return res.status(201).send({ operation: operationId })
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
