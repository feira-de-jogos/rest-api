const { io } = require('../http-server.js')
const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const Joi = require('joi');
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID.split(' ')
const db = require('../db.js')

const transferSchema = Joi.object({
  product: Joi.number().integer().positive().allow(0).required()
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
    const { product } = req.body

    const productSearch = await db.query('SELECT "type" FROM "products" WHERE "id" = $1 AND (type = (SELECT "id" FROM "types" WHERE "name" = \'foods\' LIMIT 1) OR type = (SELECT "id" FROM "types" WHERE "name" = \'arcade\' LIMIT 1));', [product])
    if (productSearch.rowCount === 0) {
      return res.status(403).send("Produto Inexistente");
    }
    const machineType = productSearch.rows[0].type

    const valueProductSearch = await db.query('SELECT "price" FROM "products" WHERE "id" = $1;', [product])
    productValue = valueProductSearch.rows[0].price;

    let expenses = await db.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "from" = $1 and "completed" = true', [userId])
    expenses = parseInt(expenses.rows[0].sum)

    let revenues = await db.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "to" = $1 and "completed" = true', [userId])
    revenues = parseInt(revenues.rows[0].sum)

    let BalanceValue = revenues - expenses;
    if (productValue > BalanceValue) {
      return res.status(402).send("Saldo Insuficiente");
    }

    const machineSearch = await db.query('SELECT "machine" FROM "stock" WHERE "product" = $1', [product]);
    const machine = machineSearch.rows[0].machine

    const machineBusySearch = await db.query('SELECT "busy" FROM "machines" WHERE "id" = $1', [machine])
    if (machineBusySearch.rows[0].busy == true) {
      return res.status(403).send("Maquina Ocupada");
    }

    const typeSearch = await db.query('SELECT "name" FROM "types" WHERE "id" = $1', [machineType])
    if (typeSearch.rows[0].name == 'foods') {
      const stockSearch = await db.query('SELECT "slot", "quantity" FROM "stock" WHERE "machine" = $1 AND "product" = $2;', [machine, product])
      if (stockSearch.rowCount === 0 || stockSearch.rows[0].quantity == 0) {
        return res.status(403).send("Produto Fora de Estoque")
      }

      await db.query('UPDATE "machines" SET "busy" = true WHERE "id" = $1 ', [machine])

      mfa = Math.floor(Math.random() * (99 - 11 + 1)) + 11
      const insertResult = await db.query('INSERT INTO "operations"("from", "to", "product", "value", "date", "mfa", "completed") VALUES($1, 1, $2, $3, NOW(), $4, false) RETURNING "id"', [userId, product, productValue, mfa])
      var operationId = insertResult.rows[0].id

      let userName = await db.query('SELECT "name" FROM "people" WHERE "email" = $1 ', [email])
      userName = userName.rows[0].name
      let stateMfaObject = {
        username: userName,
        code: mfa,
        operation: operationId
      }

      io.of('/vending-machine').emit('stateMFA', stateMfaObject)
      setTimeout(() => {
        db.query('UPDATE "machines" SET "busy" = false WHERE "id" = $1', [machine]), 30000
      })
    } else if (typeSearch.rows[0].name == 'arcade') {
      const insertResult = await db.query('INSERT INTO "operations"("from", "to", "product", "value", "date", "completed") VALUES($1, 1, $2, $3, NOW(), false) RETURNING "id"', [userId, product, productValue])
      var operationId = insertResult.rows[0].id

      const stockSearch = await db.query('SELECT "slot" FROM "stock" WHERE "machine" = $1 AND "product" = $2 LIMIT 1', [machine, product])
      if (stockSearch.rowCount === 0) {
        return res.status(403).send("Produto Fora de Estoque")
      }
      const slot = stockSearch.rows[0].slot

      io.of('/arcade').emit('coinInsert', { arcade: slot, coins: 1, operation: operationId })
    }

    return res.status(201).send({ operation: operationId })
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
