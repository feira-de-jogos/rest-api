require('dotenv').config()
const express = require('express')
const session = require('express-session')
const router = express.Router()
const bodyParser = require('body-parser')
router.use(bodyParser.json())
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const db = require('../db.js')
const audience = process.env.GOOGLE_CLIENT_ID

router.use(session({
  secret: process.env.COOKIE_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

router.post('/autenticacao', async (req, res) => {
  let payload
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.body.credential
    })
    payload = ticket.getPayload()
  } catch (err) {
    res.redirect('/')
  }

  try {
    let senha
    let id = await db.query('SELECT * FROM jogadores WHERE email = $1', [payload.email])
    if (id.rowCount === 0) {
      senha = Math.round(Math.random() * 8999 + 1000) // [0, 1] -> [1000, 9999]
      id = await db.query('INSERT INTO jogadores (apelido, senha, email) VALUES ($1, $2, $3) RETURNING id', [payload.name, senha, payload.email])
    }
    req.session.token = req.body.credential
    res.redirect('/api/v1/extrato')
  } catch (err) {
    res.sendStatus(500)
  }
})

module.exports = router
