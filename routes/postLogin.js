require('dotenv').config()
const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const audience = process.env.GOOGLE_CLIENT_ID

router.post('/login', async (req, res) => {
  let payload
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.body.credential
    })
    payload = ticket.getPayload()
    console.log(payload)
    res.send(payload.given_name, 200)
  } catch (err) {
    console.error(err)
    res.sendStatus(401)
  }
})

module.exports = router
