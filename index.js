const 	fs = require('fs'),
		path = require('path'),
		request = require('curl'),
		csv = require('csv-parse'),
		moment = require('moment'),
		sqlite = require('better-sqlite3'),
		db = new sqlite(__dirname + '/fifa.db'),
		express = require('express'),
      	http = require('http'),
      	json2csv = require('json2csv').parse,
      	config = {
      		port:4848
      	}

const	collect_matches = require('./modules/01-fifa-collect-matches-18.js'),
		build_fifa = require('./modules/04-fifa-build.js'),
		build_games = require('./modules/06-build-games.js')


let app = express()

app.get('/collect/teams', (req, res, next) => {
	collect_matches.collect(db, fs, moment, csv, request, ()=>{
		build_fifa.collect(db, fs, moment, csv, path, ()=>{
			build_games.collect(db, fs, moment, csv, json2csv, path, ()=>{
				return res.status(200).json({ message: 'New Build done.' })
			})
		})
	})
})

app.listen(config.port, function() {
 console.log("Listening on " + config.port);
});