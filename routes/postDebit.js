const { io } = require('../http-server.js')
const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const Joi = require('joi');
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID
const db = require('../db.js')

const transferSchema = Joi.object({
  machine: Joi.number().integer().positive().allow(0).required(),
  product: Joi.number().integer().positive().allow(0).required(),
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
      return res.status(400).send({ error: error.details[0].message })
    }

    const auth = await db.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.status(401).send("Usuario Não Existente no Banco de Dados!")
    }
    const userId = auth.rows[0].id
    const { machine, product } = req.body

    // Código a seguir não alinhado com o fluxo definido:
    // https://github.com/feira-de-jogos/docs/tree/main/v2#operação-de-débito

    // Verifica se a maquina existe
    const machineSearch = await db.query('SELECT * from machines where "id" = $1', [machine])
    if (machineSearch.rowCount === 0) {
      // return res.sendStatus(403).message("maquina inexistente")
      return res.status(403).send("Maquina Inexistente");
    }

    // Verifica se o produto existe e se ele pode ser comprado por arcade/vending-machine
    const productSearch = await db.query('SELECT type FROM products WHERE id = $1 AND (type = (SELECT "id" FROM "types" WHERE "name" = \'foods\' LIMIT 1) OR type = (SELECT "id" FROM "types" WHERE "name" = \'arcade\' LIMIT 1));', [product])
    if (productSearch.rowCount === 0) {
      //return res.sendStatus(403).message("produto inexistente")
      return res.status(403).send("Produto Inexistente");
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
      // return res.sendStatus(402).message("saldo insuficiente")
      return res.status(402).send("Saldo Insuficiente");
    }

    // Verifica se a m�quina esta ocupada
    const machineBusySearch = await db.query('SELECT busy from machines WHERE id = $1', [machine])
    if (machineBusySearch.rows[0].busy == true) {
      return res.status(403).send("Maquina Ocupada");
    }

    const typeSearch = await db.query('SELECT name FROM types WHERE id = $1', [machineType])
    // Verifica se o produto � da vending machine 
    if (typeSearch.rows[0].name == 'foods') {
      // Verifica se esta em estoque
      const stockSearch = await db.query('SELECT slot, quantity FROM stock WHERE machine = $1 AND product = $2;', [machine, product])
      if (stockSearch.rowCount === 0 || stockSearch.rows[0].quantity == 0) {
        return res.status(403).send("Produto Fora de Estoque")
      }
      let slot = stockSearch.rowCount[0].slot

      // Maquina fica ocupada
      const updateMachineStatus = await db.query('UPDATE "machines" SET "busy" = true WHERE "id" = $1 ', [machine])
      // Gera o Mfa
      mfa = Math.floor(Math.random() * (99 - 11 + 1)) + 11
      //Insere a operação de débito
      const insertResult = await db.query('INSERT INTO "operations"("from", "to", "product", "value", "date", "mfa", "completed") VALUES($1, 1, $2, $3, NOW(), $4, false) RETURNING id', [userId, product, productValue, mfa])
      var operationId = insertResult.rows[0].id
      // Manda o MFA para unity
      // Nao entendi esse codigo -- io.to('machine').emit('purchase', jsonString)
      let userName = await db.query('SELECT "name" FROM "people" WHERE "email" = $1 ', [email])
      userName = userName.rows[0].name
      let stateMfaObject = {
        username: userName,
        code: mfa,
        operation: operationId
      }
      // let stateMfaJsonString = JSON.stringify(stateMfaObject);
      console.log("Enviando websocket:", [stateMfaObject])
      //io.of('/vending-machine').emit('stateMFA', stateMfaJsonString)
      //
      // O motor escolhido é a columa 'slot' da tabela 'stock'
      io.of('/vending-machine').emit('stateMFA', stateMfaObject)
      // io.of('/vending-machine').emit('stateReleasing', { product: slot, operation: 77 })
    }

    if (typeSearch.rows[0].name == 'arcade') {
      // Maquina fica ocupada
      // const updateMachineStatus = await db.query('UPDATE machines SET busy = true WHERE id = $1 ', [machine])
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
