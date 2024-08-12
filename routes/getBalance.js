const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID.split(' ')
const db = require('../db.js')

router.get('/balance', async (req, res) => {
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
    const auth = await db.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }
    const userId = auth.rows[0].id

    let expenses = await db.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "from" = $1 and completed = true', [userId])
    expenses = parseInt(expenses.rows[0].sum)

    let revenues = await db.query('SELECT COALESCE(SUM("value"), 0) AS sum FROM "operations" WHERE "to" = $1 and completed = true', [userId])
    revenues = parseInt(revenues.rows[0].sum)

    let BalanceValue = revenues - expenses;

    return res.status(200).send({ balance: BalanceValue })
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
