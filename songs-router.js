import { Router } from 'express'
import { songRepository as repository } from './song-repository.js'

let router = Router()


router.get('/', async (req, res) => {
  let songs = await repository.search().returnAll()
  res.send(songs)
})

router.get('/by-artist/:artist', async (req, res) => {
  let artist = req.params.artist
  let songs = await repository.search().where('artist').eq(artist).returnAll()
  res.send(songs)
})

router.get('/by-genre/:genre', async (req, res) => {
  let genre = req.params.genre
  let songs = await repository.search().where('genres').contains(genre).returnAll()
  res.send(songs)
})

router.get('/between-years/:start-:stop', async (req, res) => {
  let start = Number.parseInt(req.params.start)
  let stop = Number.parseInt(req.params.stop)
  let songs = await repository.search().where('year').between(start, stop).returnAll()
  res.send(songs)
})

router.get('/with-lyrics/:lyrics', async (req, res) => {
  let lyrics = req.params.lyrics
  let songs = await repository.search().where('lyrics').match(lyrics).returnAll()
  res.send(songs)
})

export default router
