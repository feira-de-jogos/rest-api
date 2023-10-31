const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const db = require('../db.js')
const audience = process.env.GOOGLE_CLIENT_ID

router.post('/extrato', async (req, res) => {
  try {
    const ticket = await client.verifyIdToken({
      audience,
      idToken: req.body.credential
    })
    const payload = ticket.getPayload()

    const auth = await db.query('SELECT id FROM jogadores WHERE email = $1', [payload.email])
    if (auth.rowCount === 0) {
      res.sendStatus(401)
      return
    }

    const id = auth.rows[0].id
    let receitas = await db.query('SELECT jogos.nome AS jogo, to_char(receitas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, receitas.valor FROM receitas INNER JOIN jogos ON jogos.id = receitas.jogo_id WHERE receitas.jogador_id = $1', [id])
    receitas = { receitas: receitas.rows }

    let despesas = await db.query('SELECT produtos.descricao AS produto, to_char(despesas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, despesas.valor FROM despesas INNER JOIN produtos ON produtos.id = despesas.produto_id WHERE despesas.jogador_id = $1', [id])
    despesas = { despesas: despesas.rows }

    res.json({
      ...receitas,
      ...despesas
    })
  } catch (err) {
    res.sendStatus(500)
  }
})

module.exports = router
