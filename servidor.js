require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

app.use(cors({
  origin: [
    /github\.dev$/,
    /feira-de-jogos\.dev\.br$/
  ],
  methods: 'POST'
}))
app.use(express.urlencoded({ extended: true }))

const getRoot = require('./routes/getRoot')
const postLogin = require('./routes/postLogin')

app.use('/', getRoot)
app.use('/api/v2', postLogin)

app.listen(port, () => { console.log('Server running!') })
