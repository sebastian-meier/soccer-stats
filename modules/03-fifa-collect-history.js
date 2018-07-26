const 	fs = require('fs'),
		request = require('request'),
		csv = require('csv-parse'),
		moment = require('moment'),
		sqlite = require('better-sqlite3'),
		db = new sqlite(__dirname + '/fifa.db')

db.prepare("CREATE TABLE IF NOT EXISTS history (" +
		"id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT, " +
		"deliverydate datetime," + 
		"team_id INTEGER," + 
		"rankseq INTEGER" + 
	")").run()

let countries = db.prepare("SELECT id, code FROM teams").all([]),
	country_id = 0

const processCountry = ()=>{
	console.log('history',countries[country_id].code.toLowerCase())
	request('http://www.fifa.com/common/fifa-world-ranking/ma=' + countries[country_id].code.toLowerCase() + '/_history.js', (error, response, body)=>{
		if(error) throw error

		let stmt = db.prepare('INSERT INTO history (deliverydate, team_id, rankseq) VALUES (@deliverydate, @team_id, @rankseq)');

		let json = JSON.parse(body)
		json.forEach(b=>{
			stmt.run({
				deliverydate:b.deliverydate,
				team_id:countries[country_id].id,
				rankseq:b.rankseq
			})
		})

		nextCountry()
	})
}

const nextCountry = ()=>{
	country_id++
	if(country_id>countries.length-1){
		console.log('history done')
	}else{
		processCountry()
	}
}

processCountry()