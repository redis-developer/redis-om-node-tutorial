import { Router } from 'express'

import { songRepository as repository } from './song.js'

let router = Router()

router.put('/', async (req, res) => {

  let song = repository.createEntity()

  song.title = req.body.title ?? null
  song.artist = req.body.artist ?? null
  song.genres = req.body.genres ?? null
  song.lyrics = req.body.lyrics ?? null
  song.music = req.body.music ?? null
  song.year = req.body.year ?? null
  song.duration = req.body.duration ?? null
  song.link = req.body.link ?? null
  let id = await repository.save(song)

  res.send({ id })
})

router.get('/:id', async (req, res) => {
  let song = await repository.fetch(req.params.id)
  res.send(song)
})

router.post('/:id', async (req, res) => {
  let song = await repository.fetch(req.params.id)

  song.title = req.body.title ?? null
  song.artist = req.body.artist ?? null
  song.genres = req.body.genres ?? null
  song.lyrics = req.body.lyrics ?? null
  song.music = req.body.music ?? null
  song.year = req.body.year ?? null
  song.duration = req.body.duration ?? null
  song.link = req.body.link ?? null
  let id = await repository.save(song)

  res.send({ id })
})

router.delete('/:id', async (req, res) => {
  await repository.remove(req.params.id)
  res.type('application/json')
  res.send('OK')
})

export default router
