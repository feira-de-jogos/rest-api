const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const Joi = require('joi');
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID
const { Pool } = require('pg')
const pool = new Pool()

const transferSchema = Joi.object({
  to: Joi.number().integer().required(),
  value: Joi.number().integer().required(),
});

router.post('/transfer', async (req, res) => {
  let payload
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.token
    })
    payload = ticket.getPayload()

    var email = payload.email
  } catch (err) {
    console.error(err)
    return res.sendStatus(401)
  }

  try {
    const { error } = transferSchema.validate(req.body);
    if (error) {
      return res.status(400).send({ error: error.details[0].message });
    }

    const auth = await pool.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }
    const userId = auth.rows[0].id
    const { to, value } = req.body;

    let expenses = await pool.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "from" = $1 and "completed" = true', [userId])
    expenses = parseInt(expenses.rows[0].sum)

    let revenues = await pool.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "to" = $1 and "completed" = true', [userId])
    revenues = parseInt(revenues.rows[0].sum)

    let BalanceValue = revenues - expenses;

    if (value > BalanceValue || value < 1) {
      return res.sendStatus(402)
    }

    const destiny = await pool.query('SELECT "email" FROM "people" WHERE id = $1', [to])
    if (destiny.rowCount === 0) {
      return res.sendStatus(403)
    }

    if (to === userId) {
      return res.sendStatus(403)
    }

    const lastOperations = await pool.query('SELECT EXTRACT(EPOCH FROM (NOW() - "date")) AS "seconds_elapsed" FROM "operations" WHERE "from" = $1 AND "product" = 7 AND "date" >= NOW() - INTERVAL \'5 minutes\' ORDER BY "date" DESC LIMIT 1;', [userId]);
    if (lastOperations.rowCount !== 0) {
      const secondsElapsed = parseFloat(lastOperations.rows[0].seconds_elapsed);
      const retryAfter = Math.ceil(300 - secondsElapsed);
      return res.set('Retry-After', retryAfter.toString()).sendStatus(429);
    }

    const insertResult = await pool.query('INSERT INTO "operations"("from", "to", "product", "value", "date", "completed") VALUES($1, $2, 7, $3, NOW(), true) RETURNING "id"', [userId, to, value])
    const operationId = insertResult.rows[0].id

    return res.status(200).send({ operation: operationId })
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
