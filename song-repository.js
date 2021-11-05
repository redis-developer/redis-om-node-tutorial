import { Client, Entity, Repository, Schema } from 'redis-om'

class Song extends Entity {

  get durationAsString() {
    let minutes = Math.floor(this.duration / 60).toString()
    let seconds = (this.duration % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  toJSON() {
    return {
      id: this.entityId,
      title: this.title,
      artist: this.artist,
      genres: this.genres,
      lyrics: this.lyrics,
      music: this.music,
      year: this.year,
      duration: this.duration,
      durationString: this.durationAsString,
      link: this.link
    }
  }
}

let schema = new Schema(Song, {
  title: { type: 'string' },     // the title of the song
  artist: { type: 'string' },    // who performed the song
  genres: { type: 'array' },     // array of strings for the genres of the song
  lyrics: { type: 'string', textSearch: true }, // the full lyrics of the song
  music: { type: 'string', textSearch: true },  // who wrote the music for the song
  year: { type: 'number' },      // the year the song was releases
  duration: { type: 'number' },  // the duration of the song in seconds
  link: { type: 'string' }       // link to a YouTube video of the song
}, {
  dataStructure: 'JSON' // change this to HASH (or just ommit it) if you want to store in HASHes instead
})

let client = new Client()
await client.open()

export let songRepository = new Repository(schema, client)

try {
  await songRepository.dropIndex()
} catch (error) {
  /* sorry, not sorry */
}

await songRepository.createIndex()
