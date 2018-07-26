module.exports = {

	collect:(db, fs, moment, csv, json2csv, path, callback)=>{

		let export_path = "../../../html/fifa/"

		let rows = db.prepare("SELECT "+
				"m.*, "+
				"a.name AS awayName, "+
				"a.code2 AS awayCode2, "+
				"h.name AS homeName, "+
				"h.code2 AS homeCode2 "+
				"FROM matches AS m "+
				"LEFT JOIN teams AS a ON a.id = m.idAwayTeam "+
				"LEFT JOIN teams AS h ON h.id = m.idHomeTeam "+
				"WHERE competition_id = ? " + 
				"ORDER BY matchDate ASC")
				.all([254645])

		let teams = {}

		rows.forEach(r=>{
			if(!(r.idAwayTeam in teams)) teams[r.idAwayTeam] = 1
			if(!(r.idHomeTeam in teams)) teams[r.idHomeTeam] = 1
		})

		for(let tkey1 in teams){
			for(let tkey2 in teams){
				if(tkey1 != tkey2){
					let g = {
						id1:tkey1,
						id2:tkey2,
						matches:[]
					}

					let fPath = path.join(__dirname, export_path,  '/matches/' + ((g.id1<g.id2)?(g.id1+'-'+g.id2):(g.id2+'-'+g.id1)) + '.json')

					if (fs.existsSync(path)) {
						fs.writeFileSync(fPath, JSON.stringify(g), 'utf8')
					}
				}
			}
		}

		rows.forEach((r,ri)=>{

			let homeRank = db.prepare("SELECT * "+
				"FROM rankings "+
				"WHERE team_id = ? "+
				"ORDER BY abs(strftime('%s', ?) - strftime('%s', received)) ASC "+
				"LIMIT 1")
				.all([r.idHomeTeam, r.matchDate])

			let awayRank = db.prepare("SELECT * "+
				"FROM rankings "+
				"WHERE team_id = ? "+
				"ORDER BY abs(strftime('%s', ?) - strftime('%s', received)) ASC "+
				"LIMIT 1")
				.all([r.idAwayTeam, r.matchDate])

			for(let key in awayRank[0]){
				rows[ri]['away_'+key] = awayRank[0][key]
			}

			for(let key in homeRank[0]){
				rows[ri]['home_'+key] = homeRank[0][key]
			}

		})

		fs.writeFileSync(path.join(__dirname, export_path,  '/world-cup-matches.json'), JSON.stringify(rows), 'utf8')

		rows.forEach((r,ri)=>{
			delete rows[ri].competition_id
			delete rows[ri].id
			delete rows[ri].idRound
			rows[ri].venueName = r.venueName.trim()
			rows[ri].awayCode2 = r.awayCode2.toLowerCase()
			rows[ri].homeCode2 = r.homeCode2.toLowerCase()
		})

		let fields = []
		for(let key in rows[0]){
			fields.push(key)
		}

		const opts = { fields, quote: '' };
		 
		try {
		  const csv = json2csv(rows, opts);
		  fs.writeFileSync(path.join(__dirname, export_path,  '/world-cup-matches.csv'), csv, 'utf8')
		  console.log('game build done')
		  callback()
		} catch (err) {
		  console.error(err);
		}
	}
}
