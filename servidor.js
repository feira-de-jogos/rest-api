require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

// const postExtrato = require('./routes/postExtrato')
// const postCredito = require('./routes/postCredito')
// const postDebito = require('./routes/postDebito')
// const postEstoque = require('./routes/postEstoque')
// const postAutenticacao = require('./routes/postAutenticacao')
// const postConta = require('./routes/postConta')
// const postPix = require('./routes/postPix')
// const postControleAdm = require('./routes/postControleAdm')

app.use(cors({
  origin: [
    /feira-de-jogos\.dev\.br$/,
    /gitpod\.io$/,
    /github\.dev$/
  ],
  methods: 'POST'
}))
app.use(express.urlencoded({ extended: true }))
// app.use('/api/v2', postExtrato)
// app.use('/api/v2', postCredito)
// app.use('/api/v2', postDebito)
// app.use('/api/v2', postEstoque)
// app.use('/api/v2', postAutenticacao)
// app.use('/api/v2', postConta)
// app.use('/api/v2', postPix)
// app.use('/api/v2', postControleAdm)
app.listen(port, () => { console.log('Server running!') })
