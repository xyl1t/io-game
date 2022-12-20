# io-game over WebSockets for project days

**Authors**
* Thmoas Fischer
* Paul Trattnig
* Marat Isaw
* Benjamin Terbul
* Justus Arndt

We are trying to build a simple io-game (like agar.io). The game has just one
mode called battle royale (all players play against all players, last standing
wins). 

We log our progress in a board on [our Notion page](https://marat-isaw.notion.site/35d705d6c6db4bd6ac6cf6e7a8232735?v=8252daf928ae4b45b8853b5edb86850e)

## Run

Clone the repo and run

```sh
npm i
npm start
```

For dev purposes you can also run

```sh
npm run nodemon
```

You can optinally pass a parameter called `--port` which sets the port to
something other than `8080`.

The server will be running at `0.0.0.0` on port `8080`. In order to join the
game open a browser and enter your ip with port in the search bar. Eg:
`localhost:8080`

