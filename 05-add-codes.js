const 	fs = require('fs'),
		csv = require('csv-parse'),
		moment = require('moment'),
		sqlite = require('better-sqlite3'),
		db = new sqlite(__dirname + '/fifa.db')

csv(fs.readFileSync(__dirname + '/assets/country-codes-all.csv', 'utf8'), {columns: true}, (err, output)=>{

	let stmt = db.prepare('UPDATE teams SET code2 = @code2 WHERE code = @code OR name = @name');

	output.forEach(o=>{
		stmt.run({
			code2:o['alpha-2'],
			code:o['alpha-3'],
			name:o['name']
		})
	})

})
