require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

const postExtrato = require('./routes/postExtrato')
const postCredito = require('./routes/postCredito')
const postDebito = require('./routes/postDebito')
const postEstoque = require('./routes/postEstoque')
const postAutenticacao = require('./routes/postAutenticacao')
const postConta = require('./routes/postConta')
const postPix = require('./routes/postPix')

app.use(cors({
  origin: [
    /feira-de-jogos\.sj\.ifsc\.edu\.br$/,
    /gitpod\.io$/,
    /ifsc\.digital$/
  ],
  methods: 'POST'
}))
app.use(express.urlencoded({ extended: true }))
app.use('/api/v1', postExtrato)
app.use('/api/v1', postCredito)
app.use('/api/v1', postDebito)
app.use('/api/v1', postEstoque)
app.use('/api/v1', postAutenticacao)
app.use('/api/v1', postConta)
app.use('/api/v1', postPix)
app.listen(port, () => { console.log(`Server running at http://localhost:${port}/`) })
