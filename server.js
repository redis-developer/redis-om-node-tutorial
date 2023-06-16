import express from 'express'
import { router as songRouter } from './song-router.js'
import { router as songsRouter } from './songs-router.js'

// create an express app and use JSON
const app = new express()
app.use(express.json())

// bring in some routers
app.use('/song', songRouter)
app.use('/songs', songsRouter)

// setup the root level GET to return name and version from package.json
app.get('/', (req, res) => {
  res.send({
    name: process.env.npm_package_name,
    version: process.env.npm_package_version
  })
})

// start listening
app.listen(8080)
