const 	sqlite = require('better-sqlite3'),
		db = new sqlite(__dirname + '/sport.db'),
		fs = require('fs'),
		moment = require('moment')

//Load teams
let teams = db.prepare("SELECT * FROM teams").all([]),
	team_keys = new Map(teams.map((r,i)=>{return [r.id, i];})),
	match_keys = new Map(),
	matches = []

teams.forEach(t=>{
	teams.forEach(tt=>{
		if(t.id != tt.id && t.id < tt.id){
			matches.push({
				id1:t.id,
				id2:tt.id,
				matches:[]
			})
			match_keys.set(t.id+'-'+tt.id, matches.length-1)
		}
	})
})

//Create folder for static stat files (faster loading, no backend required)
const stat_path = __dirname + '/static/'
if (!fs.existsSync(stat_path)) {
	fs.mkdirSync(stat_path)
}

//Load all world-cup matches and associate them with their respective teams and group by match
let games = db.prepare("SELECT * FROM games").all([])

games.forEach(g=>{
	matches[match_keys.get((g.team1_id < g.team2_id)?g.team1_id+'-'+g.team2_id:g.team2_id+'-'+g.team1_id)].matches.push(g)
})

matches.forEach(m=>{
	let csv = 'date,score1,score2,et,p'
	m.matches.forEach(mm=>{
		if(moment(mm.play_at).format('YYYY')==2018){
			console.log(mm)
		}
		csv += '\n'
		csv += moment(mm.play_at).format('YYYY-MM')
		if(mm.score1p != null){
			csv += ','+mm.score1p+','+mm.score2p+',1,1'
		}else if(mm.score1et != null){
			csv += ','+mm.score1et+','+mm.score2et+',1,0'
		}else{
			csv += ','+mm.score1+','+mm.score2+',0,0'
		}
	})
	fs.writeFileSync(stat_path + m.id1+'-'+m.id2+'.csv', csv, 'utf8')
})