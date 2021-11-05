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
      durationString: this.durationString,
      link: this.link
    }
  }
}

let schema = new Schema(Song, {
  title: { type: 'string' },
  artist: { type: 'string' },
  genres: { type: 'array' },
  lyrics: { type: 'string', textSearch: true },
  music: { type: 'string', textSearch: true },
  year: { type: 'number' },
  duration: { type: 'number' },
  link: { type: 'string' }
}, {
  dataStructure: 'JSON'
})

let client = new Client()
await client.open()

let songRepository = new Repository(schema, client)

try {
  await songRepository.dropIndex()
} catch (error) {
  /* sorry, not sorry */
}

await songRepository.createIndex()

export { Song, songRepository }
