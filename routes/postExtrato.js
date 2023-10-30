const express = require('express')
const router = express.Router()
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client()
const bodyParser = require('body-parser')
const db = require('../db.js')

router.post('/extrato', async (req, res) => {
  const payload = req.body
  const { token, custom_data } = payload
  const ticket = await client.verifyIdToken({
    audience: 'pnkivbritoue59pbodppmifihnqe2tpt.apps.googleusercontent.com',
    idToken: token.credential
  })
  console.log(ticket.getPayload())

  try {
    const auth = await db.query('SELECT id FROM jogadores WHERE id = $1 AND senha = $2', [req.body.id, req.body.senha])
    if (auth.rowCount === 0) {
      res.sendStatus(401)
      return
    }

    let receitas = await db.query('SELECT jogos.nome AS jogo, to_char(receitas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, receitas.valor FROM receitas INNER JOIN jogos ON jogos.id = receitas.jogo_id WHERE receitas.jogador_id = $1', [req.body.id])
    receitas = { receitas: receitas.rows }

    let despesas = await db.query('SELECT produtos.descricao AS produto, to_char(despesas.data, \'DD/MM/YYYY HH24:MI:SS\') AS data, despesas.valor FROM despesas INNER JOIN produtos ON produtos.id = despesas.produto_id WHERE despesas.jogador_id = $1', [req.body.id])
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
