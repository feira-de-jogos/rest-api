const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID
const { Pool } = require('pg')
const pool = new Pool()

router.get('/balance', async (req, res) => {
  let payload
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.headers.authorization.split(" ")[1]
    })
    payload = ticket.getPayload()

    var email = payload.email
  } catch (err) {
    console.error(err)
    return res.sendStatus(401)
  }

  try {
    const auth = await pool.query("SELECT id FROM people WHERE email = $1 ", [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }
    const userId = auth.rows[0].id

    let expenses = await pool.query("SELECT COALESCE(SUM(value), 0) AS sum FROM operations WHERE \"from\" = $1 and completed = 't'", [userId])
    expenses = parseInt(expenses.rows[0].sum)

    let revenues = await pool.query("SELECT COALESCE(SUM(value), 0) AS sum FROM operations WHERE \"to\" = $1 and completed = 't'", [userId])
    revenues = parseInt(revenues.rows[0].sum)

    let BalanceValue = revenues - expenses;

    return res.status(200).send({ balance: BalanceValue })
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
