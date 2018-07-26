module.exports = {

	collect:(db, fs, moment, csv, path, callback)=>{

		let export_path = "../../../html/fifa/"

		//Build a profile for each team
		let countries = db.prepare("SELECT id,code,name FROM teams").all([])
		countries.forEach(c=>{

			//recent matches
			let matches = db.prepare("SELECT "+
				"m.idHomeTeam, "+
				"m.idAwayTeam, "+
				"m.matchDate, "+
				"m.scoreHome, "+
				"m.scoreAway, "+
				"m.venueName, "+
				"m.scorePenaltyAway, "+
				"m.scorePenaltyHome, "+
				"m.reasonWinCode, "+
				"c.cupKindId, "+
				"c.name,"+
				"tA.name AS tAname,"+
				"tA.code AS tAcode,"+
				"tH.name AS tHname,"+
				"tH.code AS tHcode,"+
				"rH.points AS rHpoints, "+
				"rA.points AS rApoints "+
				"FROM matches m "+
				"LEFT JOIN competitions c ON c.id = m.competition_id "+
				"LEFT JOIN rankings rH ON rH.team_id = m.idHomeTeam "+
				"LEFT JOIN rankings rA ON rA.team_id = m.idAwayTeam "+
				"LEFT JOIN teams tA ON tA.id = m.idAwayTeam "+
				"LEFT JOIN teams tH ON tH.id = m.idHomeTeam "+
				"WHERE ( m.idHomeTeam = ? OR m.idAwayTeam = ? ) "+
				"AND m.scoreAway IS NOT NULL " +
				"AND m.matchDate > date('2017-01-01') " +
				"GROUP BY m.id " +
				"ORDER BY m.matchDate DESC " +
				", rH.received DESC, rA.received DESC ")
				//"LIMIT 30")
			.all([c.id, c.id])

			//TODO: Get the closest historic ranking for the team near the match
			matches.forEach((m,mi)=>{
				let homeRank = db.prepare("SELECT "+
					"deliverydate, "+
					"rankseq "+
					"FROM history "+
					"WHERE team_id = ? "+
					"ORDER BY abs(strftime('%s', ?) - strftime('%s', deliverydate)) ASC "+
					"LIMIT 1")
					.all([m.idHomeTeam, m.matchDate])

				let awayRank = db.prepare("SELECT "+
					"deliverydate, "+
					"rankseq "+
					"FROM history "+
					"WHERE team_id = ? "+
					"ORDER BY abs(strftime('%s', ?) - strftime('%s', deliverydate)) ASC "+
					"LIMIT 1")
					.all([m.idAwayTeam, m.matchDate])

				m['deliveryDateHome'] = (homeRank.length>=1)?homeRank[0].deliverydate:0
				m['rankseqHome'] = (homeRank.length>=1)?homeRank[0].rankseq:0
				m['deliveryDateAway'] = (awayRank.length>=1)?awayRank[0].deliverydate:0
				m['rankseqAway'] = (awayRank.length>=1)?awayRank[0].rankseq:71
			})

			//historic rankings
			let rankings = db.prepare("SELECT * FROM history WHERE team_id = ?").all([c.id])

			fs.writeFileSync(path.join(__dirname, export_path,  '/profiles/'+c.id+'.json'), JSON.stringify({id:c.id,name:c.name,code:c.code,matches:matches,rankings:rankings}), 'utf8')

		})

		//Build a match for each team
		csv(fs.readFileSync(__dirname + '/fifa-teams.csv'), {columns: true}, (err, output)=>{

			let ids = output.map(o=>{return o.id;})
			let matches = db.prepare("SELECT "+
				"m.idHomeTeam, "+
				"m.idAwayTeam, "+
				"m.matchDate, "+
				"m.scoreHome, "+
				"m.scoreAway, "+
				"m.venueName, "+
				"m.scorePenaltyAway, "+
				"m.scorePenaltyHome, "+
				"m.reasonWinCode, "+
				"rH.points AS rHpoints, "+
				"rA.points AS rApoints, "+
				"c.cupKindId, "+
				"c.name "+
				"FROM matches AS m "+
				"LEFT JOIN rankings rH ON rH.team_id = m.idHomeTeam "+
				"LEFT JOIN rankings rA ON rA.team_id = m.idAwayTeam "+
				"LEFT JOIN competitions c ON c.id = m.competition_id "+
				"WHERE (idHomeTeam IN (" + ids.join(',') + ") AND idAwayTeam IN (" + ids.join(',') + ")) " + 
				"AND m.scoreAway IS NOT NULL " +
				"GROUP BY m.id "+
				"ORDER BY m.matchDate DESC")
				.all([])

			let grouping_keys = new Map(),
				groupings = []

			matches.forEach(m=>{
				let homeRank = db.prepare("SELECT "+
					"deliverydate, "+
					"rankseq "+
					"FROM history "+
					"WHERE team_id = ? "+
					"ORDER BY abs(strftime('%s', ?) - strftime('%s', deliverydate)) ASC "+
					"LIMIT 1")
					.all([m.idHomeTeam, m.matchDate])

				let awayRank = db.prepare("SELECT "+
					"deliverydate, "+
					"rankseq "+
					"FROM history "+
					"WHERE team_id = ? "+
					"ORDER BY abs(strftime('%s', ?) - strftime('%s', deliverydate)) ASC "+
					"LIMIT 1")
					.all([m.idAwayTeam, m.matchDate])

				m['deliveryDateHome'] = homeRank[0].deliverydate
				m['rankseqHome'] = homeRank[0].rankseq
				m['deliveryDateAway'] = awayRank[0].deliverydate
				m['rankseqAway'] = awayRank[0].rankseq

				let uuid = (m.idHomeTeam<m.idAwayTeam)?m.idHomeTeam+'-'+m.idAwayTeam:m.idAwayTeam+'-'+m.idHomeTeam
				if(!grouping_keys.has(uuid)){
					groupings.push({
						id1:m.idHomeTeam,
						id2:m.idAwayTeam,
						matches:[]
					})
					grouping_keys.set(uuid, groupings.length-1)
				}
				groupings[grouping_keys.get(uuid)].matches.push(m)
			})

			groupings.forEach(g=>{
				fs.writeFileSync(path.join(__dirname, export_path,  '/matches/' + ((g.id1<g.id2)?(g.id1+'-'+g.id2):(g.id2+'-'+g.id1)) + '.json'), JSON.stringify(g), 'utf8')
			})

			console.log('fifa build done')
			callback()

		})
	}
}