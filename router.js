import { Router } from 'express'
import { EntityId } from 'redis-om'

import { songRepository as repository } from './repository.js'

export let router = Router()

router.put('/song/:id', async (req, res) => {

  // save the song under the provided id, will overwrite if it already exists
  const song = await repository.save(req.params.id, req.body)

  // return the id of the song we just saved
  res.send({ id: song[EntityId] })

})

router.get('/song/:id', async (req, res) => {
  // fetch the song and return it
  const song = await repository.fetch(req.params.id)
  res.send(song)
})

router.delete('/song/:id', async (req, res) => {

  // delete the song with its id
  await repository.remove(req.params.id)

  // respond with OK
  res.type('application/json')
  res.send('"OK"')

})

router.post('/songs', async (req, res) => {

  // save the song using a generated id
  const song = await repository.save(req.body)

  // return the id of the song we just saved
  res.send({ id: song[EntityId] })

})

router.get('/songs', async (req, res) => {
  const songs = await repository.search().returnAll()
  res.send(songs)
})

router.get('/songs/by-artist/:artist', async (req, res) => {
  const artist = req.params.artist
  const songs = await repository.search().where('artist').eq(artist).returnAll()
  res.send(songs)
})

router.get('/songs/by-genre/:genre', async (req, res) => {
  const genre = req.params.genre
  const songs = await repository.search().where('genres').contains(genre).returnAll()
  res.send(songs)
})

router.get('/songs/between-years/:start-:stop', async (req, res) => {
  const start = Number.parseInt(req.params.start)
  const stop = Number.parseInt(req.params.stop)
  const songs = await repository.search().where('year').between(start, stop).returnAll()
  res.send(songs)
})

router.get('/songs/with-lyrics/:lyrics', async (req, res) => {
  const lyrics = req.params.lyrics
  const songs = await repository.search().where('lyrics').match(lyrics).returnAll()
  res.send(songs)
})

