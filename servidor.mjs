import express, { urlencoded } from 'express'
const app = express()
const port = process.env.PORT || 3000

app.use(urlencoded({ extended: true }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})
app.listen(port, () => { console.log('Server running!') })
