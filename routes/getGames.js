const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID
const { Pool } = require('pg')
const pool = new Pool()

router.get('/games', async (req, res) => {
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
    const auth = await pool.query('SELECT "id" FROM "people" WHERE "email" = $1', [email])
    if (auth.rowCount === 0) {
      return res.sendStatus(401)
    }

    let gamesSearch = await pool.query('SELECT * FROM "products" WHERE "type" = 1')
    const games = gamesSearch.rows.map(game => ({
      product: game.id,
      name: game.name,
      description: game.description,
      image: game.image,
      url: game.url
    }));

    return res.status(200).json(games);
  } catch (err) {
    console.error(err)
    return res.sendStatus(500)
  }
})

module.exports = router
