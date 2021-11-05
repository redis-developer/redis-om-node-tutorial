import express from 'express'
import songRouter from './song-router.js'
import songsRouter from './songs-router.js'

let app = new express()
app.use(express.json())
app.use('/song', songRouter)
app.use('/songs', songsRouter)

app.get('/', (req, res) => {
  res.type('application/json')
  res.send({
    name: process.env.npm_package_name,
    version: process.env.npm_package_version
  })
})

app.listen(8080)
