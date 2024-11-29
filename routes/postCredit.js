const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const Joi = require('joi')
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID_GAMES.split(' ')
const db = require('../db.js')

const transferSchema = Joi.object({
  product: Joi.number().integer().positive().allow(0).required(),
  value: Joi.number().integer().positive().required(),
})

router.post('/credit', async (req, res) => {
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
    const { error } = transferSchema.validate(req.body)
    if (error) {
      return res.status(400).send({ error: error.details[0].message })
    }

    const auth = await db.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }
    const userId = auth.rows[0].id
    const { product, value } = req.body

    const productSearch = await db.query('SELECT * from "products" WHERE "id" = $1 AND "type" = (SELECT "id" FROM "types" WHERE "name" = \'games\' LIMIT 1)', [product])
    if (productSearch.rowCount === 0) {
      return res.sendStatus(403)
    }

    // Min value is 1
    if (value < 1) {
      return res.sendStatus(402)
    }

    // Max value is 1000
    if (value > 1000) {
      return res.sendStatus(403)
    }

    const lastOperations = await db.query('SELECT EXTRACT(EPOCH FROM (NOW() - "date")) AS "seconds_elapsed" FROM "operations" WHERE "to" = $1 AND "product" = $2 AND "date" >= NOW() - INTERVAL \'5 minutes\' ORDER BY "date" DESC LIMIT 1;', [userId, product])
    if (lastOperations.rowCount !== 0) {
      const secondsElapsed = parseFloat(lastOperations.rows[0].seconds_elapsed)
      const retryAfter = Math.ceil(300 - secondsElapsed)
      return res.set('Retry-After', retryAfter.toString()).sendStatus(429)
    }

    const insertResult = await db.query('INSERT INTO "operations"("from", "to", "product", "value", "date", "completed") VALUES(1, $1, $2, $3, NOW(), true) RETURNING "id"', [userId, product, productSearch.rows[0].price > 0 ? productSearch.rows[0].price : value])
    const operationId = insertResult.rows[0].id

    return res.status(201).send({ operation: operationId })
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
