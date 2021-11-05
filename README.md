# Up and Running with Express and Redis OM for Node.js in 5-minutes

OK. So that title is a bold claim. And this is a read-and-follow-along sort of tutorial. So, it might be 6 minutes or 4 minutes depending on how fast you type. Regardless, this should get you building something useful quickly and could make a nice foundation for something bigger.

Oh, and you might be wondering what [Redis OM](https://github.com/redis-developer/redis-om-node) is. Well, there's an extensive [README](https://github.com/redis-developer/redis-om-node/blob/main/README.md) on GitHub. Go check it out!

Also, [this document](https://github.com/redis-developer/redis-om-node-tutorial/blob/main/README.md), and [the code](https://github.com/redis-developer/redis-om-node-tutorial) that we're about to implement, and [the data](https://github.com/redis-developer/redis-om-node-tutorial/tree/main/songs) needed to test it are all out on GitHub. Refer to them as you need.

## Let's Build Something

So, what are we going to build? We're going to build a RESTful service that lets you manage songs. It'll let you do all the CRUD things (that's create, read, update, and delete for the uninitiated) with songs. Plus, we'll add some cool search endpoints to the service as well. That way, we can find songs by an artist or genre, from a particular year, or with certain lyrics.

Test data for this problem was a little tricky. Most song lyrics are copyrighted and getting permission to use them for a little old tutorial wasn't really an option. And we definitely want to be able to search on song lyrics. How else are we going to find that songs that goes "oooo ah ah ah ah"?

Fortunately, my buddy [Dylan Beattie](https://dylanbeattie.net/) is literally the original [rockstar developer](https://github.com/RockstarLang/rockstar). In addition to coding cool things, he writes [parody songs](https://dylanbeattie.net/music/) with a tech theme. And, he has given me permission to use them as test data.

## Humble Beginings

We're using Redis as our database—that's the whole idea behind Redis OM. So, you'll need some Redis, specifically with [RediSearch][redisearch-url] and [RedisJSON][redis-json-url] installed. The easiest way to do this is to set up a free [Redis Cloud][redis-cloud-url] instance. But, you can also use Docker:

    $ docker run -p 6379:6379 redislabs/redismod:preview

I'm assuming you are relatively Node.js savvy so you should be able to get that installed on your own. We'll be using the _top-level await_ feature for modules that was introduced in Node v14.8.0 so do make sure you have that version, or a newer one. If you don't, go and get it.

Once you have that, it's time to create a project:

    $ npm init

Give it a name, version, and description. Use whatever you like. I called mine "Metalpedia".

Install [Express](https://expressjs.com/) and Redis OM for Node.js:

    $ npm install express redis-om --save

And, just to make our lives easy, we'll use [nodemon](https://nodemon.io/):

    $ npm install nodemon --save-dev

Now that stuff is installed, let's set up some other details in our `package.json`. First, set the "type" to "module", so we can use ES6 Modules:

```json
  "type": "module",
```

The "test" script that `npm init` generates isn't super useful for us. Replace that with a "start" script that calls `nodemon`. This will allow the service we build to restart automatically whenever we change a file. Very convenient:

```json
  "scripts": {
    "start": "nodemon server.js"
  },
```

I like to make my packages private, so they don't accidentally get pushed to NPM:

```json
  "private": true,
```

Oh, and you don't need the "main" entry. We've not building a package to share. So go ahead and remove that.

Now, you should have a `package.json` that looks something like this:

```json
{
  "name": "metalpedia",
  "version": "1.0.0",
  "description": "Sample application for building a music repository backed by Redis and Redis OM.",
  "type": "module",
  "scripts": {
    "start": "nodemon server.js"
  },
  "author": "Guy Royse <guy@guyroyse.com> (http://guyroyse.com/)",
  "license": "MIT",
  "private": true,
  "dependencies": {
    "express": "^4.17.1",
    "redis-om": "^0.1.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.14"
  }
}
```

Excellent. Set up done. Let's write some code!

## Getting the Express Service Up and Running

I like to write my services with a little version and name endpoint at the root. That way if some random developer hits the site of the service, they'll get a clue as to what it is. So let's do that:

Create a file named `server.js` in the root of your project folder and populate it thus:

```javascript
import express from 'express'

// create an express app and use JSON
let app = new express()
app.use(express.json())

// setup the root level GET to return name and version from package.json
app.get('/', (req, res) => {
  res.send({
    name: process.env.npm_package_name,
    version: process.env.npm_package_version
  })
})

// start listening
app.listen(8080)
```

We now have enough to actually run something. So let's run it:

    $ npm start

Then, hit `http://localhost:8080/` in your favorite browser. You should see something like this:

```json
{
  "name": "metalpedia",
  "version": "1.0.0"
}
```

Or, hit your service using `curl` (and `json_pp` if you want to be fancy):

    $ curl -X GET http://localhost:8080 -s | json_pp
    {
      "name": "metalpedia",
      "version": "1.0.0"
    }

Cool. Let's add some Redis.

## Mapping Songs to Redis

We're going to use Redis OM to map data for a song from JSON data in Redis to JavaScript objects.

Create a file named `song-repository.js` in the root of your project folder. In it, import all the parts from Redis OM that you'll need:

```javascript
import { Entity, Schema, Client, Repository } from 'redis-om'
```

Entities are the classes that you work with—the thing being mapped to. The are what you create, read, update, and delete. Any class that extends `Entity` is an entity. We'll define our Song entity with a single line for now, but we'll add some more to it later:

```javascript
class Song extends Entity {}
```

Schemas define the fields on your entity, their types, and how they are mapped internally to Redis. By default, entities map to Hashes in Redis but we want ours to use JSON instead. When a `Schema` is created, it will add properties to the provided entity class based on the schema information provided. Here's a `Schema` that maps to our `Song`:

```javascript
let schema = new Schema(Song, {
  title: { type: 'string' }, // the title of the song
  artist: { type: 'string' }, // who performed the song
  genres: { type: 'array' }, // array of strings for the genres of the song
  lyrics: { type: 'string', textSearch: true }, // the full lyrics of the song
  music: { type: 'string', textSearch: true }, // who wrote the music for the song
  year: { type: 'number' }, // the year the song was releases
  duration: { type: 'number' }, // the duration of the song in seconds
  link: { type: 'string' } // link to a YouTube video of the song
}, {
  dataStructure: 'JSON' // change this to HASH (or just ommit it) if you want to store in HASHes instead
})
```

Clients are used to connect to Redis. Create a `Client` and pass your Redis URL in the construtor. If you don't specify a url, it will default to `redis://localhost:6379`. Clients have methods to `.open`, `.close`, and `.execute` raw Redis commands, but we're just going to open it:

```javascript
let client = new Client()
await client.open()
```

> Remember that _top-level await_ stuff I mentioned at the top of the document? There it is!

Now we have all the pieces that we need to create a `Repository`. Repositories are the main interface into Redis OM. They give use the methods to read, write, and remove entities. Create a repository—and make sure it's exported as you'll need it when we get into the Express stuff:

```javascript
export let songRepository = new Repository(schema, client)
```

We're almost done with setting up our repository. But we still need to create an index or we won't be able to search on anything. We do that by calling `.createIndex`. But if an index already exists, that will result in an error. So, we need to call `.dropIndex` before we call `.createIndex`. But if an index *doesn't* exists, that will create and error too. This will be changed in a future release, but for now, we must deal with it:

```javascript
try {
  await songRepository.dropIndex()
} catch (error) {
  /* sorry, not sorry */
}

await songRepository.createIndex()
```

We have what we need to talk to Redis. Now, let's use to to make some routes in Express.

## Using Redis OM for CRUD Operations

Let's create a truly RESTful API with the CRUD operations mapping to PUT, GET, POST, and DELETE respectively. We're going to do this using Express Routers as this makes our code nice and tidy. So, create a file called `song-router.js` in the root of your project folder. Then add the imports and create a `Router`:

```javascript
import { Router } from 'express'
import { songRepository as repository } from './song-repository.js'

export let router = Router()
```

This router will be added in `server.js` under the `/song` path so all of the paths in our routes here will be relative to that path.

To the router, add a PUT to save a new song:

```javascript
router.put('/', async (req, res) => {

  // create the Song so we can save it
  let song = repository.createEntity()

  // set all the properties, converting missing properties to null
  song.title = req.body.title ?? null
  song.artist = req.body.artist ?? null
  song.genres = req.body.genres ?? null
  song.lyrics = req.body.lyrics ?? null
  song.music = req.body.music ?? null
  song.year = req.body.year ?? null
  song.duration = req.body.duration ?? null
  song.link = req.body.link ?? null

  // save the Song to Redis
  let id = await repository.save(song)

  // return the id of the newly created Song
  res.send({ id })

})
```

Now that we have a way to shove songs into Redis, let's start shoving. Out on GitHub there are a bunch of [JSON files](https://github.com/redis-developer/redis-om-node-tutorial/tree/main/songs) with song data in them. (Thanks [Dylan](https://dylanbeattie.net/)! Go ahead and pull those down and place them in a folder under your project root called `songs`.

Let's use `curl` to load in a song. I'm partial to [_HTML_](https://www.youtube.com/watch?v=woKUEIJkwxI), sung to the tune of AC/DC's _Highway to Hell_, so let's use that one:

    $ curl -X PUT -H "Content-Type: application/json" -d "@songs/html.json" http://localhost:8080/song -s | json_pp

You should get back the ID of that newly inserted song:

```json
  {
    "id" : "01FKRW9WMVXTGF71NBEM3EBRPY"
  }
```

We're shipping HTML indeed. If you have the `redis-cli` handy, or want to use [RedisInsight](https://redis.com/redis-enterprise/redis-insight/), you can take a look and see how Redis has stored this:

    > json.get Song:01FKRW9WMVXTGF71NBEM3EBRPY
    "{\"title\":\"HTML\",\"artist\":\"Dylan Beattie and the Linebreakers\",\"genres\":[\"blues rock\",\"hard rock\",\"parody\",\"rock\"],\"lyrics\":\"W3C, RFC, a JIRA ticket and a style guide.\\\\nI deploy with FTP, run it all on the client side\\\\nDon\xe2\x80\x99t need Ruby, don\xe2\x80\x99t need Rails,\\\\nAin\xe2\x80\x99t nothing running on my stack\\\\nI\xe2\x80\x99m hard wired, for web scale,\\\\nYeah, I\xe2\x80\x99m gonna bring the 90s back\\\\n\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML,\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML\xe2\x80\xa6\\\\n\\\\nNo logins, no trackers,\\\\nNo cookie banners to ignore\\\\nI ain\xe2\x80\x99t afraid of, no hackers\\\\nJust the occasional 404\\\\nThey hatin\xe2\x80\x99, what I do,\\\\nBut that\xe2\x80\x99s \xe2\x80\x98cos they don\xe2\x80\x99t understand\\\\nMark it up, break it down,\\\\nRemember to escape your ampersands\xe2\x80\xa6\\\\n\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML,\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML\xe2\x80\xa6\\\\n\\\\n(But it\xe2\x80\x99s really just markdown.)\",\"music\":\"\\\"Highway to Hell\\\" by AC/DC\",\"year\":2020,\"duration\":220,\"link\":\"https://www.youtube.com/watch?v=woKUEIJkwxI\"}"

Yep. Looks like JSON. Let's add a GET method to read this song from HTTP instead of using the `redis-cli`:

```javascript
router.get('/:id', async (req, res) => {

  // fetch the Song 
  let song = await repository.fetch(req.params.id)

  // return the Song we just fetched
  res.send(song)

})
```

Now you can use `curl` or your browser to load `http://localhost:8080/song/01FKRW9WMVXTGF71NBEM3EBRPY` to fetch the song:

    $ curl -X GET http://localhost:8080/song/01FKRW9WMVXTGF71NBEM3EBRPY -s | json_pp

And you should get back...

```json
{
   "entityId" : "01FKRW9WMVXTGF71NBEM3EBRPY",
   "entityData" : {
      "artist" : "Dylan Beattie and the Linebreakers",
      "title" : "HTML",
      "lyrics" : "W3C, RFC, a JIRA ticket and a style guide.\\nI deploy with FTP, run it all on the client side\\nDon’t need Ruby, don’t need Rails,\\nAin’t nothing running on my stack\\nI’m hard wired, for web scale,\\nYeah, I’m gonna bring the 90s back\\n\\nI’m shipping HTML,\\nHTML,\\nI’m shipping HTML,\\nHTML…\\n\\nNo logins, no trackers,\\nNo cookie banners to ignore\\nI ain’t afraid of, no hackers\\nJust the occasional 404\\nThey hatin’, what I do,\\nBut that’s ‘cos they don’t understand\\nMark it up, break it down,\\nRemember to escape your ampersands…\\n\\nI’m shipping HTML,\\nHTML,\\nI’m shipping HTML,\\nHTML…\\n\\n(But it’s really just markdown.)",
      "link" : "https://www.youtube.com/watch?v=woKUEIJkwxI",
      "genres" : [
         "blues rock",
         "hard rock",
         "parody",
         "rock"
      ],
      "duration" : 220,
      "music" : "\"Highway to Hell\" by AC/DC",
      "year" : 2020
   }
}
```

...complete wrong results! What's up with that? Well, our entity doesn't know how to serialize itself to JSON so Express is doing that for us. And since `JSON.stringify`, which Express is using, can't see the properties that the Schema added, it's just rending the internal implementation of the entity. We can fix that by making our `Song` smarter.

Let's add a `.toJSON` method to `Song` to create something that `JSON.stringify` can deal with. And while we're at it, let's add a computed field as well:

```javascript
class Song extends Entity {

  // converts duration to minutes and seconds
  get durationAsString() {
    let minutes = Math.floor(this.duration / 60).toString()
    let seconds = (this.duration % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  toJSON() {
    return {
      id: this.entityId, // the underlying ID is worthy of being exposed 
      title: this.title,
      artist: this.artist,
      genres: this.genres,
      lyrics: this.lyrics,
      music: this.music,
      year: this.year,
      duration: this.duration,
      durationString: this.durationAsString, // returning a computed field
      link: this.link
    }
  }
}
```

Now let's try getting that again:

    $ curl -X GET http://localhost:8080/song/01FKRW9WMVXTGF71NBEM3EBRPY -s | json_pp

Much better!

```json
{
   "link" : "https://www.youtube.com/watch?v=woKUEIJkwxI",
   "genres" : [
      "blues rock",
      "hard rock",
      "parody",
      "rock"
   ],
   "id" : "01FKRW9WMVXTGF71NBEM3EBRPY",
   "title" : "HTML",
   "lyrics" : "W3C, RFC, a JIRA ticket and a style guide.\\nI deploy with FTP, run it all on the client side\\nDon’t need Ruby, don’t need Rails,\\nAin’t nothing running on my stack\\nI’m hard wired, for web scale,\\nYeah, I’m gonna bring the 90s back\\n\\nI’m shipping HTML,\\nHTML,\\nI’m shipping HTML,\\nHTML…\\n\\nNo logins, no trackers,\\nNo cookie banners to ignore\\nI ain’t afraid of, no hackers\\nJust the occasional 404\\nThey hatin’, what I do,\\nBut that’s ‘cos they don’t understand\\nMark it up, break it down,\\nRemember to escape your ampersands…\\n\\nI’m shipping HTML,\\nHTML,\\nI’m shipping HTML,\\nHTML…\\n\\n(But it’s really just markdown.)",
   "duration" : 220,
   "artist" : "Dylan Beattie and the Linebreakers",
   "durationString" : "3:40",
   "music" : "\"Highway to Hell\" by AC/DC",
   "year" : 2020
}
```

Now that we can read and write, let's implement the *REST* of the HTTP verbs. REST... get it?

Updating with POST:

```javascript
router.post('/:id', async (req, res) => {

  // fetch the Song we are replacing
  let song = await repository.fetch(req.params.id)

  // set all the properties, converting missing properties to null
  song.title = req.body.title ?? null
  song.artist = req.body.artist ?? null
  song.genres = req.body.genres ?? null
  song.lyrics = req.body.lyrics ?? null
  song.music = req.body.music ?? null
  song.year = req.body.year ?? null
  song.duration = req.body.duration ?? null
  song.link = req.body.link ?? null

  // save the Song to Redis
  let id = await repository.save(song)

  // return the id of the Song we just saved
  res.send({ id })

})
```

And the `curl` command to try it out, replacing Dylan's _HTML_ with _D.M.C.A._—sung to the tune of _Y.M.C.A._ by the Village People:

    $ curl -X POST -H "Content-Type: application/json" -d "@songs/d-m-c-a.json" http://localhost:8080/song/01FKRW9WMVXTGF71NBEM3EBRPY -s | json_pp

You should get back the ID of that updated song:

    {
      "id" : "01FKRW9WMVXTGF71NBEM3EBRPY"
    }

And, finally, let's implement delete:

```javascript
router.delete('/:id', async (req, res) => {

  // delete the Song with its id
  await repository.remove(req.params.id)

  // respond with OK
  res.type('application/json')
  res.send('OK')
})
```

And test it out:

    $ curl -X DELETE http://localhost:8080/song/01FKRW9WMVXTGF71NBEM3EBRPY -s
    OK

Which just returns "OK".

## Searching with Redis OM
