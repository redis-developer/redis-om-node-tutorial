import { Router } from 'express'
import { EntityId } from 'redis-om'

import { songRepository as repository } from './song-repository.js'

export let router = Router()

router.put('/:id', async (req, res) => {

  // save the song under the provided id, will overwrite if it already exists
  const song = await repository.save(req.params.id, req.body)

  // return the id of the song we just saved
  res.send({ id: song[EntityId] })

})

router.get('/:id', async (req, res) => {
  // fetch the song and return it
  const song = await repository.fetch(req.params.id)
  res.send(song)
})

router.delete('/:id', async (req, res) => {

  // delete the song with its id
  await repository.remove(req.params.id)

  // respond with OK
  res.type('application/json')
  res.send('OK')

})
