const { io } = require('../http-server.js')
const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const Joi = require('joi');
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID.split(' ')
const db = require('../db.js')

const MfaSchema = Joi.object({
  operation: Joi.number().integer().positive().required(),
  code: Joi.number().integer().min(10).max(99).required(),
});

router.post('/mfa', async (req, res) => {
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
    const { error } = MfaSchema.validate(req.body);
    if (error) {
      return res.status(400).send({ error: error.details[0].message })
    }

    const auth = await db.query('SELECT "id" FROM "people" WHERE "email" = $1;', [email])
    if (auth.rowCount === 0) {
      return res.status(401).send("Usuario Não Existente no Banco de Dados!")
    }
    const { operation, code } = req.body

    const operationSearch = await db.query('SELECT "mfa", "product" from "operations" WHERE "id" = $1;', [operation])
    if (operationSearch.rowCount === 0) {
      return res.status(403).send("Operação não encontrada para esse usuário!")
    }
    const MfaNumber = operationSearch.rows[0].mfa
    const product = operationSearch.rows[0].product

    if (MfaNumber != code) {
      return res.status(403).send("Código Mfa inválido, tente novamente!")
    }

    // Localizar o produto no estoque (/debit já verificou se o produto está disponível)
    let stockSearchSlot =  await db.query('SELECT "slot" FROM "stock" WHERE "product" = $1 and machine = (SELECT "id" from "machines" where "name" LIKE \'vending-machine%\' LIMIT 1);', [product])
    const slot = stockSearchSlot.rows[0].slot

    // Emitir evento para a máquina de vendas
    io.of('/vending-machine').emit('stateReleasing', { product: slot, operation: operation })
    return res.sendStatus(200)
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
