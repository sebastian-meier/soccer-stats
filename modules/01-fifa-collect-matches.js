const 	fs = require('fs'),
		request = require('request'),
		csv = require('csv-parse'),
		moment = require('moment'),
		sqlite = require('better-sqlite3'),
		db = new sqlite(__dirname + '/fifa.db')

db.prepare("CREATE TABLE IF NOT EXISTS teams (" +
      "id INTEGER UNIQUE PRIMARY KEY, " +
      "code text," + 
      "code2 text," + 
      "name text" + 
	")").run()

db.prepare("CREATE TABLE IF NOT EXISTS competitions (" +
      "id INTEGER UNIQUE PRIMARY KEY, " +
      "name text," + 
      "idCup INTEGER," + 
      "edition text," + 
      "idCupSeason INTEGER," + 
      "countryCode text," + 
      "cupKindID INTEGER," + 
      "cupKindName text" + 
	")").run()

db.prepare("CREATE TABLE IF NOT EXISTS matches (" +
      "id INTEGER UNIQUE PRIMARY KEY, " +
      "competition_id INTEGER," +
      "idRound INTEGER," + 
      "idHomeTeam INTEGER," + 
      "idAwayTeam INTEGER," + 
      "matchDate datetime," + 
      "scoreHome INTEGER," + 
      "scoreAway INTEGER," + 
      "venueName text," + 
      "idWinTeam INTEGER," + 
      "scorePenaltyAway INTEGER," + 
      "scorePenaltyHome INTEGER," + 
      "reasonWinCode INTEGER" + 
	")").run()

let 	teams = []

let 	c_team_id = 0,
		c_year_id = 0

const _matchesbyteam = (json)=>{
	for(let key in json.competitionslist){
		let c = json.competitionslist[key]
		let competition = {
			id:key,
			name:c.name,
         	idCup:c.idCup,
         	edition:c.edition,
         	idCupSeason:c.idCupSeason,
         	countryCode:c.countryCode,
         	cupKindID:c.cupKindID,
         	cupKindName:c.cupKindName
		}

		let stmt = db.prepare('INSERT or IGNORE INTO competitions VALUES (@id, @name, @idCup, @edition, @idCupSeason, @countryCode, @cupKindID, @cupKindName)');
		stmt.run(competition)

		c.matchlist.forEach(m=>{

			//The FIFA Api returns all matches by all national teams of that country not only by the requested team
			if(m.idHomeTeam == teams[c_team_id].id || m.idAwayTeam == teams[c_team_id].id){

				let stmt = db.prepare('INSERT or IGNORE INTO teams VALUES (@id, @code, @name)');

				stmt.run({
						id:m.idHomeTeam,
						code:m.homeCountryCode,
						name:m.homeTeamName
					})



				stmt.run({
						id:m.idAwayTeam,
						code:m.awayCountryCode,
						name:m.awayTeamName
					})

				stmt = db.prepare('INSERT or IGNORE INTO matches VALUES (@idMatch, @competition_id, @idRound, @idHomeTeam, @idAwayTeam, @matchDate, @scoreHome, @scoreAway, @venueName, @idWinTeam, @scorePenaltyAway, @scorePenaltyHome, @reasonWinCode)');

				let match = {
	               	idMatch:parseInt(m.idMatch), //":11144,
					competition_id: key,
	               	idRound:parseInt(m.idRound), //":1482,
	               	idHomeTeam:parseInt(m.idHomeTeam), //":43947,
	               	idAwayTeam:parseInt(m.idAwayTeam), //":43948,
	               	matchDate:moment(m.matchDate).format('YYYY-MM-DD HH:mm:ss'), //":"1995-03-29T00:00:00Z",
	               	scoreHome:parseInt(m.scoreHome), //":0,
	               	scoreAway:parseInt(m.scoreAway), //":2,
	               	venueName:m.venueName, //":"Tbilisi ",
	               	idWinTeam:parseInt(m.idWinTeam), //":43948,
				   	scorePenaltyAway:(('scorePenaltyAway' in m))?parseInt(m.scorePenaltyAway):0, //": 5,
				   	scorePenaltyHome:(('scorePenaltyHome' in m))?parseInt(m.scorePenaltyHome):0, //": 6,
	    			reasonWinCode:('reasonWinCode' in m)?parseInt(m.reasonWinCode):0 //": 3,  //undefined > normal, 3 > Elfmeter, 2 > Verlängerung, 4 > aggregate after regular time, 5 > win on aggregate after extra time,  6 win on away goal after regular time, 7 win on away goal after extra time 8 silver goal 9 golden goal
	    		}

	    		stmt.run(match)
	    	}
		})
	}

	nextYear()
}

const _yearsbyteam = (json)=>{
	if(json.listItem.length>=1){
		teams[c_team_id]['years'] = json.listItem.map(l=>{return l.value;})
		c_year_id = 0
		getMatches()
	}else{
		nextTeam()
	}
}

const nextTeam = ()=>{
	c_team_id++
	if(c_team_id>teams.length-1){
		process.exit()
	}else{
		getYears()
	}
}

const nextYear = ()=>{
	c_year_id++
	if(c_year_id>teams[c_team_id].years.length-1){
		nextTeam()
	}else{
		getMatches()
	}
}

const getMatches = ()=>{
	console.log('getMatches', teams[c_team_id].name, teams[c_team_id].years[c_year_id])
	request('http://data.fifa.com/livescores/en/matches/byteam/'+teams[c_team_id].id+'/years/'+teams[c_team_id].years[c_year_id], (error, response, body)=>{
		if(error) throw error;
		eval(body)
	})
}

const getYears = ()=>{
	console.log('getYears', teams[c_team_id].name)
	request('http://data.fifa.com/livescores/en/years/teams/'+teams[c_team_id].id, (error, response, body)=>{
		if(error) throw error;
		eval(body)
	})
}

csv(fs.readFileSync(__dirname + '/fifa-teams.csv'), {columns: true}, (err, output)=>{
	teams = output;
	getYears()
})

//years
