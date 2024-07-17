const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID
const { Pool } = require('pg')
const pool = new Pool()

router.get('/statement', async (req, res) => {
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
    const auth = await pool.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }
    const userId = auth.rows[0].id

    let statementSearch = await pool.query('SELECT "operations"."id" AS "operation", "from_person"."name" AS "from", "to_person"."name" AS "to", "products"."name" AS "product", "operations"."value" AS "value", TO_CHAR("operations"."date", \'DD/MM/YYYY HH24:MI:SS\') AS timestamp, "operations"."mfa" AS mfa, "operations"."completed" AS completed FROM "operations" LEFT JOIN "people" AS from_person ON "operations"."from" = "from_person"."id" LEFT JOIN "people" AS "to_person" ON "operations"."to" = "to_person"."id" LEFT JOIN "products" ON "operations"."product" = "products"."id" WHERE "operations"."to" = $1 OR "operations"."from" = $1 ORDER BY "operations"."date" DESC;', [userId])
    const statement = statementSearch.rows.map(statement => ({
      operation: statement.operation,
      from: statement.from,
      to: statement.to,
      product: statement.product,
      value: statement.value,
      timestamp: statement.timestamp,
      completed: statement.completed
    }));

    return res.status(200).json(statement)
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
