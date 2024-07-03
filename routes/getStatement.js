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
    const auth = await pool.query("SELECT id FROM people WHERE email = $1", [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }
    const userId = auth.rows[0].id

    let statementSearch = await pool.query("SELECT operations.id AS id, origem_person.name AS origem, destino_person.name AS destino, products.name AS produto, operations.value AS valor, TO_CHAR(operations.date, 'DD/MM/YYYY HH24:MI:SS') AS data, operations.mfa AS mfa, operations.completed AS concluida FROM operations LEFT JOIN people AS origem_person ON operations.from = origem_person.id LEFT JOIN people AS destino_person ON operations.to = destino_person.id LEFT JOIN products ON operations.product = products.id WHERE operations.to = $1 OR operations.from = $1 ORDER BY operations.date DESC;", [userId])
    const statement = statementSearch.rows.map(statement => ({
      id: statement.id,
      origem: statement.origem,
      destino: statement.destino,
      produto: statement.produto,
      valor: statement.valor,
      data: statement.data,
      twofa: statement.mfa,
      concluida: statement.concluida
    }));

    return res.status(200).json(statement)
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
