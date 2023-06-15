import { Client, Entity, Schema } from 'redis-om'

class Song extends Entity {}

let schema = new Schema(Song, {
  title: { type: 'string' },     // the title of the song
  artist: { type: 'string' },    // who performed the song
  genres: { type: 'string[]' },  // array of strings for the genres of the song
  lyrics: { type: 'text' },      // the full lyrics of the song
  music: { type: 'text' },       // who wrote the music for the song
  year: { type: 'number' },      // the year the song was releases
  duration: { type: 'number' },  // the duration of the song in seconds
  link: { type: 'string' }       // link to a YouTube video of the song
})

let client = await new Client().open()

export let songRepository = client.fetchRepository(schema)

await songRepository.createIndex()
