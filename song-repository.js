import { Schema, Repository } from 'redis-om'
import { redis } from './redis.js'

const schema = new Schema('song', {
  title: { type: 'string' },     // the title of the song
  artist: { type: 'string' },    // who performed the song
  genres: { type: 'string[]' },  // array of strings for the genres of the song
  lyrics: { type: 'text' },      // the full lyrics of the song
  music: { type: 'text' },       // who wrote the music for the song
  year: { type: 'number' },      // the year the song was releases
  duration: { type: 'number' },  // the duration of the song in seconds
  link: { type: 'string' }       // link to a YouTube video of the song
})

export const songRepository = new Repository(schema, redis)

await songRepository.createIndex()
