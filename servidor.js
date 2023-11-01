const express = require('express')
const app = express()
const port = process.env.PORT || 3000

const postExtrato = require('./routes/postExtrato')
const postCredito = require('./routes/postCredito')
const postDebito = require('./routes/postDebito')
const postEstoque = require('./routes/postEstoque')

app.use(express.urlencoded({ extended: true }))
app.use('/api/v1', postExtrato)
app.use('/api/v1', postCredito)
app.use('/api/v1', postDebito)
app.use('/api/v1', postEstoque)
app.listen(port, () => { console.log(`Server running at http://localhost:${port}/`) })
