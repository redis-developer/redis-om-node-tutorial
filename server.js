import express from 'express'
import rootRouter from './lib/routers/root-router.js'
import songRouter from './lib/routers/song-router.js'
import songsRouter from './lib/routers/songs-router.js'

let app = new express()
app.use(express.json())
app.use('/', rootRouter)
app.use('/song', songRouter)
app.use('/songs', songsRouter)
app.listen(8080)
