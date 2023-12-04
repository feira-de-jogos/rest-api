const express = require('express')
const router = express.Router()
const Joi = require('joi')
const bodyParser = require('body-parser')
router.use(bodyParser.json())
const db = require('../db.js')

const debitoEsquema = Joi.object({
  id: Joi.number().integer().min(0).required(),
  senha: Joi.number().integer().min(0).required(),
  maquina: Joi.number().integer().min(0).required(),
  produto: Joi.number().integer().min(0).required()
}).required()

router.post('/debito', async (req, res) => {
  try {
    const validationResult = debitoEsquema.validate(req.body)
    if (validationResult.error) {
      res.status(400).send(validationResult.error.details[0].message)
      return
    }

    const auth = await db.query('SELECT id FROM jogadores WHERE id = $1 AND senha = $2', [req.body.id, req.body.senha])
    if (auth.rowCount === 0) {
      res.sendStatus(401)
      return
    }

    let receitas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM receitas WHERE jogador_id = $1', [req.body.id])
    receitas = parseInt(receitas.rows[0].sum)
    if (isNaN(receitas)) { receitas = 0 }

    let despesas = await db.query('SELECT COALESCE(SUM(valor), 0) FROM despesas WHERE jogador_id = $1', [req.body.id])
    despesas = parseInt(despesas.rows[0].sum)
    if (isNaN(despesas)) { despesas = 0 }

    const produto = await db.query('SELECT id, valor FROM produtos WHERE id = $1 AND EXISTS (SELECT 1 FROM estoque WHERE maquina_id = $2 AND produto_id = produtos.id AND quantidade > 0);', [req.body.produto, req.body.maquina])
    if (produto.rowCount === 0) {
      res.sendStatus(403)
      return
    }
    const valor = produto.rows[0].valor

    if ((receitas - despesas) < valor) {
      res.sendStatus(402)
      return
    }

    await db.query('INSERT INTO despesas (jogador_id, produto_id, valor, data) VALUES ($1, $2, $3, NOW())', [req.body.id, req.body.produto, valor])
    await db.query('UPDATE estoque SET quantidade = quantidade - 1 WHERE produto_id = $1;', [req.body.produto])
    res.sendStatus(200)
  } catch (error) {
    res.sendStatus(500)
  }
})

module.exports = router
