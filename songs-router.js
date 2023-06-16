import { Router } from 'express'
import { EntityId } from 'redis-om'

import { songRepository as repository } from './song-repository.js'

export let router = Router()

router.post('/', async (req, res) => {

  // save the song using a generated id
  const song = await repository.save(req.body)

  // return the id of the song we just saved
  res.send({ id: song[EntityId] })

})

router.get('/', async (req, res) => {
  const songs = await repository.search().returnAll()
  res.send(songs)
})

router.get('/by-artist/:artist', async (req, res) => {
  const artist = req.params.artist
  const songs = await repository.search().where('artist').eq(artist).returnAll()
  res.send(songs)
})

router.get('/by-genre/:genre', async (req, res) => {
  const genre = req.params.genre
  const songs = await repository.search().where('genres').contains(genre).returnAll()
  res.send(songs)
})

router.get('/between-years/:start-:stop', async (req, res) => {
  const start = Number.parseInt(req.params.start)
  const stop = Number.parseInt(req.params.stop)
  const songs = await repository.search().where('year').between(start, stop).returnAll()
  res.send(songs)
})

router.get('/with-lyrics/:lyrics', async (req, res) => {
  const lyrics = req.params.lyrics
  const songs = await repository.search().where('lyrics').match(lyrics).returnAll()
  res.send(songs)
})
