const 	fs = require('fs'),
		request = require('request'),
		csv = require('csv-parse'),
		moment = require('moment'),
		sqlite = require('better-sqlite3'),
		db = new sqlite(__dirname + '/fifa.db')

db.prepare("CREATE TABLE IF NOT EXISTS rankings (" +
		"id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT, " +
		"received datetime," + 
		"team_id INTEGER," + 
		"nummatch4 INTEGER," + 
		"nummatch3 INTEGER," + 
		"nummatch2 INTEGER," + 
		"nummatch1 INTEGER," + 
		"gamesyear1 INTEGER," + 
		"pointsyear4 REAL," + 
		"discountedyear4 REAL," + //all discounted year together are current points
		"pointsyear3 REAL," + 
		"discountedyear3 REAL," + 
		"pointsyear2 REAL," + 
		"discountedyear2 REAL," + 
		"pointsyear1 REAL," + 
		"discountedyear1 REAL," + 
		"pointsyear234 REAL," + 
		"points REAL," +
		"rank INTEGER" + 
	")").run()

request('http://www.fifa.com/common/fifa-world-ranking/_ranking_matchpoints_totals.js', (error, response, body)=>{
	if(error) throw error

	let json = JSON.parse(body)

	json.sort((a, b)=>{
		if (a.points > b.points) {
			return -1
		}
		if (a.points < b.points) {
			return 1
		}
		return 0
	})

	json.forEach((r,ri)=>{

		let rows = db.prepare("SELECT id FROM teams WHERE code = ?").all([r.countrycode])
		if(rows.length>0){
			console.log('rankings', r.countrycode)

			let stmt = db.prepare('INSERT INTO rankings (received, team_id, nummatch4, nummatch3, nummatch2, nummatch1, gamesyear1, pointsyear4, discountedyear4, pointsyear3, discountedyear3, pointsyear2, discountedyear2, pointsyear1, discountedyear1, pointsyear234, points, rank) VALUES (@received, @team_id, @nummatch4, @nummatch3, @nummatch2, @nummatch1, @gamesyear1, @pointsyear4, @discountedyear4, @pointsyear3, @discountedyear3, @pointsyear2, @discountedyear2, @pointsyear1, @discountedyear1, @pointsyear234, @points, @rank)');

			let ranking = {
               	received:moment().format('YYYY-MM-DD HH:mm:ss'), //":11144,
               	team_id:rows[0].id, //":1482,
               	nummatch4:parseFloat(r.nummatch4),
				nummatch3:parseFloat(r.nummatch3),
				nummatch2:parseFloat(r.nummatch2),
				nummatch1:parseFloat(r.nummatch1),
				gamesyear1:parseFloat(r.gamesyear1),
				pointsyear4:parseFloat(r.pointsyear4),
				discountedyear4:parseFloat(r.discountedyear4),
				pointsyear3:parseFloat(r.pointsyear3),
				discountedyear3:parseFloat(r.discountedyear3),
				pointsyear2:parseFloat(r.pointsyear2),
				discountedyear2:parseFloat(r.discountedyear2),
				pointsyear1:parseFloat(r.pointsyear1),
				discountedyear1:parseFloat(r.discountedyear1),
				pointsyear234:parseFloat(r.pointsyear234),
				points:parseFloat(r.points),
				rank:(ri+1)
    		}

    		stmt.run(ranking)

		}else{
			console.log('not found', r.countrycode)
		}

	})
})