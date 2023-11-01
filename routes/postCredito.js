const express = require('express')
const router = express.Router()
const Joi = require('joi')
const bodyParser = require('body-parser')
router.use(bodyParser.json())
const db = require('../db.js')

const creditoEsquema = Joi.object({
  id: Joi.number().integer().min(0).required(),
  senha: Joi.number().integer().min(0).required(),
  jogo: Joi.number().integer().min(0).required(),
  valor: Joi.number().integer().min(1).required()
}).required()

router.post('/credito', async (req, res) => {
  const validationResult = creditoEsquema.validate(req.body)
  if (validationResult.error) {
    res.status(400).send(validationResult.error.details[0].message)
    return
  }

  const auth = await db.query('SELECT id FROM jogadores WHERE id = $1 AND senha = $2', [req.body.id, req.body.senha])
  if (auth.rowCount === 0) {
    res.sendStatus(401)
    return
  }

  try {
    const credito = await db.query('INSERT INTO receitas (jogador_id, jogo_id, valor, data) values ($1, $2, $3, NOW())', [req.body.id, req.body.jogo, req.body.valor])
    res.json(credito)
  } catch (err) {
    res.sendStatus(500)
  }
})

module.exports = router
