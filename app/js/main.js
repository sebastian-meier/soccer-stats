let proj = proj4('+proj=aea +lat_1=50 +lat_2=70 +lat_0=56 +lon_0=100 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs'),
	project = (lambda, phi) => {
		return proj.forward([lambda, phi].map(radiansToDegrees));
	}

project.invert = (x, y) => {
	return proj.inverse([x, y]).map(degreesToRadians);
}

let projection = d3.geoProjection(project),
	geopath = d3.geoPath().projection(projection)

var mapFiles = ['./data/countries.topo.json', './data/locations.json'];

Promise.all(mapFiles.map(url => d3.json(url))).then(function(mapData) {
		let json = mapData[0]

		let map_svg = d3.select('#header svg'),
			world = topojson.feature(json, json.objects.collection),
			russia = null,
			map_width = (d3.select('#header').node().getBoundingClientRect()).width

		world.features.forEach(f=>{
			if(f.id == 'RUS'){
				russia = f
			}
		})

		let geoLocations = {
			type:'Feature',
			properties:{},
			geometry:{
				type:'MultiPoint',
				coordinates:[]
			}
		}

		mapData[1].forEach(l=>{
			geoLocations.geometry.coordinates.push([l.lng,l.lat])
		})

		fitProjection(geoLocations)

		map_svg.attr('width', map_width)
			.attr('height', 600)

		let map_map = map_svg.selectAll('path').data(world.features).enter().append('path')
			.style("fill", "#EEE")
			.style("stroke", "#FEFEFE")
			.attr("d", geopath)

		let map_russia = map_svg.append('path').datum(russia)
			.style("fill", "#DDD")
			.style("stroke", "#CCC")
			.attr("d", geopath)

		map_svg.append('defs').append('linearGradient')
			.attr('gradientUnits','objectBoundingBox')
			.attr('id','mapGradient')
			.attr('x1','0%')
			.attr('x2','0%')
			.attr('y1','0%')
			.attr('y2','100%')
			.html('<stop offset="0%" stop-color="rgba(255,255,255,0)" /><stop offset="100%" stop-color="rgba(255,255,255,1)" />')

		let map_overlay = map_svg.append('rect')
			.style('fill','url(#mapGradient)')
			.attr('x',0)
			.attr('y',550)
			.attr('height',50)
			.attr('width',map_width)

		let map_marker = map_svg.selectAll('rect.marker').data(mapData[1]).enter().append('rect')
			.style('transform-origin', d=>(projection([d.lng,d.lat])).join('px ')+'px' )
			.style('transform', 'rotate(45deg)')
			.attr('class','marker')
			.attr('width', 10)
			.attr('height', 10)
			.style('fill', '#FF1560')
			.attr('x', d=>(projection([d.lng,d.lat]))[0]-5)
			.attr('y', d=>(projection([d.lng,d.lat]))[1]-5)

		window.addEventListener("resize", debounce(()=>{
			map_width = (d3.select('#header').node().getBoundingClientRect()).width
			map_svg.attr('width', map_width)
			fitProjection(geoLocations)
			map_overlay.attr('width', map_width)
			map_marker.style('transform-origin', d=>(projection([d.lng,d.lat])).join('px ')+'px' )
				.attr('x', d=>(projection([d.lng,d.lat]))[0]-5)
				.attr('y', d=>(projection([d.lng,d.lat]))[1]-5)
			map_map.attr("d", geopath)
			map_russia.attr("d", geopath)
		}))

	}).catch(e=>{
		throw(e)
	})

let teamCodes = {}, teams = [], team_keys = [],
	importance = {
		100:[4, 'FIFA OTHER'],
		101:[5, 'FIFA'],
		102:[3, 'CONTINENTAL'],
		105:[1, 'FRIENDLIES'],
		106:[4, 'FIFA OTHER'],
		109:[2, 'NATIONAL'],
		111:[4,'CONTINENTAL CUPS'],
		103:[4,'CONTINENTAL CUPS']
	}

d3.csv('https://vislab.lupus.uberspace.de/fifa/world-cup-matches.csv')
	.then(csv=>{
		csv.forEach(c=>{
			if(!(c.idAwayTeam in teamCodes)) teamCodes[c.idAwayTeam] = c.awayCode2
			if(!(c.idHomeTeam in teamCodes)) teamCodes[c.idHomeTeam] = c.homeCode2
			if(!(c.idAwayTeam in team_keys)){ teams.push({id:c.idAwayTeam, name:c.awayName, rank:c.away_rank}); team_keys[c.idAwayTeam] = teams.length-1; }
			if(!(c.idHomeTeam in team_keys)){ teams.push({id:c.idHomeTeam, name:c.homeName, rank:c.home_rank}); team_keys[c.idHomeTeam] = teams.length-1; }
		})

		teams.sort((a,b)=>{
			if (a.name < b.name) {
    			return -1
  			}else if (a.name > b.name) {
    			return 1
  			}
  			return 0
		})

		d3.select('#op1').selectAll('option').data(teams).enter().append('option').attr('value',d=>d.id).text(d=>d.name)
		d3.select('#op2').selectAll('option').data(teams).enter().append('option').attr('value',d=>d.id).text(d=>d.name)

		d3.selectAll('#op1, #op2').on('change',()=>{
			let v1 = d3.select('#op1').property('value')
			let v2 = d3.select('#op2').property('value')
			if(v1 == v2){
				d3.select('#op2').property('value', '--');
			}
		})

		d3.select('#compare-button').on('click', ()=>{
			let v1 = d3.select('#op1').property('value')
			let v2 = d3.select('#op2').property('value')
			buildDetails(v1,v2)
		})

		let rows = d3.select('#matches tbody').selectAll('tr').data(csv).enter().append('tr')
		rows.append('td')
			.attr('class', 'mt-datetime')
			.html(d=>{
				return moment(d.matchDate).format('DD-MM-YYYY HH:mm')+'<br />'+d.venueName
			})

		rows.append('td')
			.attr('class', 'mt-team1')
			.html(d=>d.homeName+'&nbsp;<img src="./assets/flag-icon-css/4x3/'+d.homeCode2+'.svg" />')

		rows.append('td')
			.attr('class', 'mt-rank mt-home-rank')
			.text(d=>'#'+d.home_rank)

		rows.append('td')
			.attr('class', 'mt-score')
			.html(d=>calcResult(d)[0])

		rows.append('td')
			.attr('class', 'mt-compare')
			.append('svg')
				.datum(d=>{
					return {
						rank1:d.home_rank,
						rank2:d.away_rank
					};
				})
				.attr('width', 50)
				.attr('height', 50)
				.call(buildIcon, 50, true)

		rows.append('td')
			.attr('class', 'mt-score')
			.html(d=>calcResult(d)[1])

		rows.append('td')
			.attr('class', 'mt-rank mt-away-rank')
			.text(d=>'#'+d.away_rank)

		rows.append('td')
			.attr('class', 'mt-team2')
			.html(d=>'<img src="./assets/flag-icon-css/4x3/'+d.awayCode2+'.svg" />&nbsp;'+d.awayName)

		rows.append('td')
			.append('a')
				.attr('href', '#team-details')
				.html('more&nbsp;&raquo;')
				.on('click', d=>{
					buildDetails(d.idHomeTeam, d.idAwayTeam)
				})

	}).catch(err=>{
		throw err
	})

const buildDetails = (id1, id2)=>{

	id1 = parseInt(id1)
	id2 = parseInt(id2)

	let homeId = (id1<id2)?id1:id2,
		awayId = (id1<id2)?id2:id1

	Promise.all(new Array("https://vislab.lupus.uberspace.de/fifa/profiles/"+homeId+".json", "https://vislab.lupus.uberspace.de/fifa/profiles/"+awayId+".json", "https://vislab.lupus.uberspace.de/fifa/matches/"+homeId+"-"+awayId+".json").map(url => d3.json(url))).then(function(files) {

		new Array(files[0],files[1]).forEach((f,fi)=>{
			f.rankings.forEach((r,ri)=>{
				files[fi].rankings[ri]['date'] = moment(r.deliverydate).toDate()
				files[fi].rankings[ri]['sdate'] = Math.round(moment(r.deliverydate).toDate()/100000)
				files[fi].rankings[ri]['cDate'] = moment(r.deliverydate).format('MM/YYYY')
			})
		})

		let rank_width = 660,
			rank_height = 360,
			rank_margin = 50

		let head = d3.select('#team-head'),
			body = d3.select('#rank-body'),
			hbody = d3.select('#historic-body')

		rank_width = (body.node().getBoundingClientRect()).width

		head.selectAll('*').remove()
		body.selectAll('*').remove()
		hbody.selectAll('*').remove()

		d3.selectAll('#rank-legend-t1 *, #rank-legend-t2 *').remove()

		d3.select('#rank-legend-t1').append('span').text(files[0].name)
		d3.select('#rank-legend-t2').append('span').text(files[1].name)

		let rank_x_scale = d3.scaleTime()
			.range([0,rank_width-2*rank_margin])
			.domain([d3.min([d3.min(files[0].rankings, d=>d.date), d3.min(files[1].rankings, d=>d.date)]), d3.max([d3.max(files[0].rankings, d=>d.date), d3.max(files[1].rankings, d=>d.date)])])
			.nice()

		let rank_y_scale = d3.scaleLinear()
			.range([0,(rank_height-2*rank_margin)])
			.domain([d3.min([d3.min(files[0].rankings, d=>d.rankseq), d3.min(files[1].rankings, d=>d.rankseq)]), d3.max([d3.max(files[0].rankings, d=>d.rankseq), d3.max(files[1].rankings, d=>d.rankseq)])])
			.nice()

		let rank_x_axis = d3.axisBottom(rank_x_scale)
			.ticks(8),
			rank_x_grid = d3.axisBottom(rank_x_scale)
			.ticks(8)

		let rank_y_axis = [
				d3.axisLeft(rank_y_scale)
					.ticks(8),
				d3.axisRight(rank_y_scale)
					.ticks(8)
			],
			rank_y_grid = [
				d3.axisLeft(rank_y_scale)
					.ticks(8),
				d3.axisRight(rank_y_scale)
					.ticks(8)
			]

		let rank_line = d3.line()
			.x(d=>rank_x_scale(d.date))
			.y(d=>rank_y_scale(d.rankseq))

		let cRank1 = files[0].rankings[files[0].rankings.length-1].rankseq,
			cRank2 = files[1].rankings[files[1].rankings.length-1].rankseq

		head.append('h2').html('<span class="home"><img src="./assets/flag-icon-css/4x3/'+teamCodes[files[0].id]+'.svg" />&nbsp;'+files[0].name + '<br /><span class="titleRankHome">#' + cRank1 + '</span></span><svg width="70" height="70"></svg><span class="away">' + files[1].name + '&nbsp;<img src="./assets/flag-icon-css/4x3/'+teamCodes[files[1].id]+'.svg" /><br /><span class="titleRankAway">#' + cRank2 + '</span></span>')
		d3.select('#historic-left').html('<img src="./assets/flag-icon-css/4x3/'+teamCodes[files[0].id]+'.svg" />&nbsp;'+files[0].name)
		d3.select('#historic-right').html(files[1].name+'&nbsp;<img src="./assets/flag-icon-css/4x3/'+teamCodes[files[1].id]+'.svg" />')
		d3.select('h2 svg').datum({
			rank1:cRank1,
			rank2:cRank2
		}).call(buildIcon, 70, true)

		let root_svg = body.append('svg')
			.classed('rankChart',true)
			.attr('width',rank_width)
			.attr('height', rank_height)
			.attr("viewBox", "0 0 "+rank_width+" "+rank_height)
			.attr("preserveAspectRatio", "xMidYMid meet")

		let svg = root_svg.append('g')
				.attr('transform', 'translate('+rank_margin+','+rank_margin/2+')')

		let rankIndicator = svg.append('line')
			.attr('class', 'rankIndicator')
			.style('display', 'none')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', rank_height-2*rank_margin)

		let x_axis = svg.append('g')
			.attr('class', 'rank_x_axis')
			.attr('transform', 'translate(0,'+(rank_height-2*rank_margin+5)+')')
			.call(rank_x_axis)

		let y_axis = []

		new Array(0,1).forEach((t,ti)=>{
			y_axis[ti] = svg.append('g')
				.attr('class', 'rank_y_axis')
				.attr('transform', 'translate('+((ti==1)?(rank_width-2*rank_margin+5):-5)+',0)')
				.call(rank_y_axis[ti])
		})

		let tickValues = []

		y_axis[0].selectAll(".tick").each(function(data) {
			tickValues.push(data)
		});

		if(tickValues[0] == 0){
			tickValues[0] = 1
			rank_y_axis[0].tickValues(tickValues)
			rank_y_axis[1].tickValues(tickValues)
			rank_y_grid[0].tickValues(tickValues)
			rank_y_grid[1].tickValues(tickValues)

			new Array(0,1).forEach((t,ti)=>{
				y_axis[ti].call(rank_y_axis[ti])
			})
		}

		let y_grid = svg.append('g')
			.attr('class', 'bg-grid')
			.attr('transform', 'translate(-5,0)')
			.call(rank_y_grid[0].tickSize(-(rank_width-2*rank_margin+10)).tickFormat(''))

		let x_grid = svg.append('g')
			.attr('class', 'bg-grid')
			.call(rank_x_grid.tickSize(rank_height-2*rank_margin+5).tickFormat(''))

		let homeLine = svg.append('path')
			.attr('class', 'rankLine rankLine-home')
			.data([files[0].rankings])
			.attr('d', rank_line)

		let awayLine = svg.append('path')
			.attr('class', 'rankLine rankLine-away')
			.data([files[1].rankings])
			.attr('d', rank_line)

		let tooltip = [], tooltip_text = [], tooltip_bg = [], tooltip_keys = [{},{}]

		new Array(0,1).forEach((t,ti)=>{
			tooltip[ti] = svg.append('g').attr('class', 'rank_tooltip '+((ti==0)?'rank_home_tooltip':'rank_away_tooltip'))
				.style('display','none')

			tooltip[ti].append('path')
				.attr('class', 'top')
				.attr('d', 'M0,-7L-5,-12L5,-12Z')

			tooltip[ti].append('path')
				.attr('class', 'bottom')
				.attr('d', 'M0,-35L-5,-30L5,-30Z')

			tooltip_bg[ti] = tooltip[ti].append('rect')
				.attr('height',14)
				.attr('y',-28)

			tooltip_text[ti] = tooltip[ti].append('text')
				.attr('text-anchor', 'middle')
				.attr('y',-17)

			tooltip[ti].append('circle')
				.attr('class','top')
				.attr('r', 3)
				.attr('cy',0)
				.attr('cx',0)

			tooltip[ti].append('circle')
				.attr('class','bottom')
				.attr('r', 3)
				.attr('cy',-42)
				.attr('cx',0)

			files[ti].rankings.forEach((r,ri)=>{
				files[ti].rankings[ri]['d'] = ti
				tooltip_keys[ti][r.sdate] = r
			})
		})

		let tooltip_data = [files[0].rankings,files[1].rankings]

		let int_rect = svg.append('rect')
			.style('fill','transparent')
			.attr('x',0)
			.attr('y',0)
			.attr('width',rank_width-2*rank_margin)
			.attr('height',rank_height-2*rank_margin)
			.on('mousemove', ()=>{
				let pos = d3.mouse(int_rect.node())

				let invert = Math.round(Date.parse(rank_x_scale.invert(pos[0]))/100000)
				
				let closest = false,
					close_i = 0

				while(!closest){
					new Array(0,1).forEach(ti=>{
						if((invert+close_i) in tooltip_keys[ti]){
							closest = invert+close_i
						}else if((invert-close_i) in tooltip_keys[ti]){
							closest = invert-close_i
						}
					})
					close_i++
				}

				rankIndicator.style('display','block')
					.attr('x1', rank_x_scale(tooltip_keys[0][closest].date))
					.attr('x2', rank_x_scale(tooltip_keys[0][closest].date))

				new Array(0,1).forEach(ti=>{
					if(closest in tooltip_keys[ti]){
						let w = tooltip_text[ti].text(tooltip_keys[ti][closest].rankseq + ' : ' + tooltip_keys[ti][closest].cDate).node().getComputedTextLength()
						tooltip_bg[ti]
							.attr('width', w+4)
							.attr('x', -(w/2)-2)

						let tooltip_class = 'bottom'

						if((closest in tooltip_keys[0]) && (closest in tooltip_keys[1])){
							if(tooltip_keys[ti][closest].rankseq < tooltip_keys[(ti==0)?1:0][closest].rankseq){
								tooltip_class = 'top'
							}else if(ti == 1 && tooltip_keys[ti][closest].rankseq == tooltip_keys[(ti==0)?1:0][closest].rankseq){
								tooltip_class = 'top'
							}
						}

						tooltip[ti].style('display','block')
							.classed('bottom', (tooltip_class=='bottom')?true:false)
							.classed('top', (tooltip_class=='top')?true:false)
							.attr('transform','translate('+rank_x_scale(tooltip_keys[0][closest].date)+','+(rank_y_scale(tooltip_keys[ti][closest].rankseq) + ((tooltip_class == 'top')?0:+42) )+')')

					}else{
						tooltip[ti].style('display','none')
					}
				})


			}).on('mouseout', ()=>{
				rankIndicator.style('display','none')
				new Array(0,1).forEach(ti=>{
					tooltip[ti].style('display','none')
				})
			})

		/*--- MATCHES ---*/

		let matches = [], sumDiff = 0

		files[2].matches.forEach((m,mi)=>{
			let keyC1 = 'Home',
				keyC2 = 'Away'
				keyS1 = 'H',
				keyS2 = 'A'

			if(m.idHomeTeam == awayId){
				keyC1 = 'Away'
				keyC2 = 'Home'
				keyS1 = 'A'
				keyS2 = 'H'
			}

			let result1 = m['score'+keyC1],
				result2 = m['score'+keyC2],
				resultPenalty1 = m['scorePenalty'+keyC1],
				resultPenalty2 = m['scorePenalty'+keyC2],
				points1 = m['r'+keyS1+'points'],
				points2 = m['r'+keyS2+'points'],
				rank1 = m['rankseq'+keyC1],
				rank2 = m['rankseq'+keyC2],
				win = 0,
				diff = Math.abs(result1-result2)

			if(resultPenalty1!=0||resultPenalty2!=0){
				if(resultPenalty1<resultPenalty2){
					win = 1
				}else if(resultPenalty2<resultPenalty1){
					win = -1
				}
				diff = Math.abs(resultPenalty1-resultPenalty2)
			}else{
				if(result1<result2){
					win = 1
				}else if(result2<result1){
					win = -1
				}
			}

			if(result1 != null || result2 != null){

				matches.push({
					side:win,
					result1:result1,
					result2:result2,
					resultPenalty1:resultPenalty1,
					resultPenalty2:resultPenalty2,
					scoreHome:result1,
					scoreAway:result2,
					scorePenaltyHome:resultPenalty1,
					scorePenaltyAway:resultPenalty2,
					points1:points1,
					points2:points2,
					rank1:rank1,
					rank2:rank2,
					venueName:m.venueName.trim(),
					reasonWinCode:m.reasonWinCode,
					name:m.name,
					matchDate:m.matchDate,
					winType:win,
					win:win*diff,
					c:matches.length+1,
					diff:diff
				})

				sumDiff += Math.abs(diff)
			}
		})

		matches.forEach((m,mi)=>{
			if(m.side == 0){
				let t_side = m.side
				if(matches.length==1){
					t_side = 1
				}else if(mi==0){
					if(matches[mi+1] != 0){
						t_side = matches[mi+1].side * -1
					}else{
						t_side = 1
					}
				}else{
					t_side = matches[mi-1].side * -1
				}
				matches[mi].side = t_side
			}
		})

		matches.unshift({c:0, win:0})
		matches.push({c:matches.length, win:0})

		let match_width = (hbody.node().getBoundingClientRect()).width
			match_width = (match_width<700)?700:match_width,
			match_text_col = 250,
			match_p_width = (match_width<700)?700:match_width - match_text_col*2,
			match_block = 50,
			match_margin = 25,
			match_p_height = matches.length*match_block,
			match_height = match_p_height + 100 + 2*match_margin

		let rootg_svg = hbody.append('svg')
			.classed('matchChart',true)
			.attr('width',(match_width<700)?700:match_width)
			.attr('height', match_height)
			.attr("viewBox", "0 0 "+((match_width<700)?700:match_width)+" "+match_height)
			.attr("preserveAspectRatio", "xMidYMid meet")

		let gsvg = rootg_svg.append('g')
			.attr('transform', 'translate('+match_margin+','+(match_margin+100)+')')

		let pathg = gsvg.append('g')
			.attr('transform', 'translate('+(match_width/2-match_margin)+',0)')

		let arrowline, arrowleft, arrowright, arrowTleft, arrowTright, icons,icon_lines,legend, matchp_path, maxDiff, match_x_scale, match_y_scale, match_line, rangeDiff, ipathg, matchp_result, matchp_icon, matchp_rank1, matchp_rank2, matchp_meta1, matchp_meta2

		if(matches.length > 2){

			d3.select('#historic-head').style('display', 'block');

			maxDiff = d3.max(matches, d=>Math.abs(d.win))
			rangeDiff = d3.extent(matches, d=>d.win)

			if(maxDiff == 0) maxDiff = 1

			let defs = gsvg.append('defs')
			
			let colorScale = d3.scaleLinear().range(['#FF1560','#0E85F2']).domain([-maxDiff, maxDiff])

			if(sumDiff>0){
				defs.append('linearGradient')
					.attr('gradientUnits','objectBoundingBox')
					.attr('id','legendGradient')
					.html('<stop offset="0%" stop-color="'+colorScale(-maxDiff)+'" /><stop offset="50%" stop-color="'+colorScale(0)+'" /><stop offset="100%" stop-color="'+colorScale(maxDiff)+'" />')

				defs.append('linearGradient')
					.attr('gradientUnits','objectBoundingBox')
					.attr('id','matchGradient')
					.html('<stop offset="0%" stop-color="'+colorScale(rangeDiff[0])+'" /><stop offset="'+ Math.round(Math.abs(rangeDiff[0])/(Math.abs(rangeDiff[0])+Math.abs(rangeDiff[1]))*100) +'%" stop-color="'+colorScale(0)+'" /><stop offset="100%" stop-color="'+colorScale(rangeDiff[1])+'" />')
			}

			//LEGEND
			if(sumDiff>0){
				pathg.append('text')
					.style('fill','#000')
					.text('Goal difference')
					.attr('text-anchor', 'middle')
					.attr('dy',-90)

				legend = pathg.append('path')
					.style('fill', 'url(#legendGradient)')
					.attr('transform', 'translate('+(-match_p_width/2)+',-80)')
					.attr('d', 'M0,25L25,50L'+(match_p_width-25)+',50L'+match_p_width+',25L'+(match_p_width-25)+',0L25,0L0,25Z')

				arrowline = pathg.append('line')
					.attr('x1', -match_p_width/2+10)
					.attr('x2', match_p_width/2-10)
					.attr('y1', 25-80)
					.attr('y2', 25-80)
					.style('stroke','#fff')

				arrowleft = pathg.append('path')
					.attr('transform', 'translate('+(-match_p_width/2+10)+','+(25-80)+')')
					.attr('d', 'M10,-10L0,0L10,10')
					.style('stroke','#fff')
					.style('fill','none')

				arrowright = pathg.append('path')
					.attr('transform', 'translate('+(match_p_width/2-10)+','+(25-80)+')')
					.attr('d', 'M-10,-10L0,0L-10,10')
					.style('stroke','#fff')
					.style('fill','none')

				arrowTleft = pathg.append('text')
					.style('font-size','13px')
					.text('+'+maxDiff+' '+files[0].name)
					.style('fill', '#fff')
					.attr('x', -match_p_width/2+30)
					.attr('y', 18-80)

				arrowTRight = pathg.append('text')
					.style('font-size','13px')
					.attr('text-anchor', 'end')
					.text('+'+maxDiff+' '+files[1].name)
					.style('fill', '#fff')
					.attr('x', match_p_width/2-30)
					.attr('y', 43-80)

			}

			pathg.append('line')
				.attr('stroke', colorScale(0))
				.attr('x1', 0)
				.attr('x2', 0)
				.attr('y1', -10)
				.attr('y2', match_p_height+10)

			match_x_scale = d3.scaleLinear().domain([-maxDiff,maxDiff]).range([-match_p_width/2,match_p_width/2])
			match_y_scale = d3.scaleLinear().domain([0,matches.length-1]).range([0,match_p_height])
			match_line = d3.line()
					.y(d=>match_y_scale(d.c))
					.x(d=>match_x_scale(d.win))

			ipathg = pathg.append('g');

			if(sumDiff>0){
				matchp_path = ipathg.append('path')
					.attr('class', 'match_path')
					.style('fill', 'url(#matchGradient)')
					.data([matches])
					.attr('d', match_line)
			}

			icons = ipathg.append('g').selectAll('g')
				.data(matches.filter((d,i)=>(i>0&&i<matches.length-1)?true:false))
				.enter().append('g')
					.attr('class', 'match_icon')
					.attr('title', d=>d.side)
					.attr('transform', d=>'translate('+match_x_scale(d.win)+','+match_y_scale(d.c)+')')

			icon_lines = icons.append('line')
				.attr('y1',0)
				.attr('y2',0)
				.attr('x1',0)
				.attr('x2',d=>d.side * (match_width/2-match_x_scale(Math.abs(d.win))-match_margin))
				.attr('stroke', d=>{
					if(d.win == 0){
						return 'rgba(150,150,150,1)'
					}else if(d.win > 0){
						return '#0E85F2'
					}else{
						return '#FF1560'
					}
				})

			matchp_result = icons.append('text')
				.attr('class', 'matchp_result')
				.attr('dy',-10)
				.attr('text-anchor', d=>(d.side==-1)?'end':'start')
				.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 10)+',0)')
				.html(d=>calcResult(d)[0]+':'+calcResult(d)[1])

			matchp_icon = icons.append('g').attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 60)+',-20)')
			matchp_icon.call(buildIcon, 30, false)

			matchp_rank1 = icons.append('text')
				.attr('text-anchor', d=>(d.side==-1)?'end':'start')
				.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 85)+',-20)')
				.attr('class', 'matchp_rankAway')
				.text(d=>'#'+d.rank2)

			matchp_rank2 = icons.append('text')
				.attr('text-anchor', d=>(d.side==-1)?'end':'start')
				.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 85)+',-4)')
				.attr('class', 'matchp_rankHome')
				.text(d=>'#'+d.rank1)

			matchp_meta1 = icons.append('text')
				.attr('class', 'matchp_meta')
				.attr('text-anchor', d=>(d.side==-1)?'end':'start')
				.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 115)+',-4)')
				.text(d=>d.venueName)

			matchp_meta2 = icons.append('text')
				.attr('class', 'matchp_meta')
				.attr('text-anchor', d=>(d.side==-1)?'end':'start')
				.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 115)+',-20)')
				.text(d=>moment(d.matchDate).format('DD-MM-YYYY'))
			
		}else{
			d3.select('#historic-head').style('display', 'none');
			hbody.selectAll('*').remove()
			hbody.html('<p style="text-align:center; padding-top:50px;">Looks like, according to FIFA, those two teams have not yet played against each other.</p>')
		}

		/*------ Recent Games ------*/

		let mds_height = 400,
			mds_margin = 40,
			mds_width, mds_color_scale = [],
			mds_x_scale = [],
			mds_y_scale = [],
			mds_r_scale = [],
			mds_x_axis = [],
			mds_y_axis = [],
			win_extent = [],
			mds_svg = [], 
			mds_g = [], 
			mds_y_axis_g = [], 
			mds_x_axis_g = [], 
			mds_container = [],
			mds_x_label = [], mds_y_label = [], mds_x_line = [], mds_x_label1 = [], 
			mds_x_label2 = [], rank_extent = [], mds_y_line = [], mds_y_label1 = [],
			mds_y_label2 = [], mds_circles = []

		new Array(1,2).forEach(side=>{
			let container = d3.select('#game-body'+side+' tbody')
			container.selectAll('*').remove()

			files[side-1].matches.forEach((m,mi)=>{

				let keyC1 = 'Home',
					keyC2 = 'Away'
					keyS1 = 'H',
					keyS2 = 'A'

				if(files[side-1].id == m.idAwayTeam){
					keyC1 = 'Away'
					keyC2 = 'Home'
					keyS1 = 'A'
					keyS2 = 'H'
				}

				let result1 = m['score'+keyC1],
					result2 = m['score'+keyC2],
					resultPenalty1 = m['scorePenalty'+keyC1],
					resultPenalty2 = m['scorePenalty'+keyC2],
					points1 = m['r'+keyS1+'points'],
					points2 = m['r'+keyS2+'points'],
					rank1 = m['rankseq'+keyC1],
					rank2 = m['rankseq'+keyC2],
					win = 0,
					diff = Math.abs(result1-result2)

				if(resultPenalty1!=0||resultPenalty2!=0){
					if(resultPenalty1<resultPenalty2){
						win = 1
					}else if(resultPenalty2<resultPenalty1){
						win = -1
					}
					diff = Math.abs(resultPenalty1-resultPenalty2)
				}else{
					if(result1<result2){
						win = 1
					}else if(result2<result1){
						win = -1
					}
				}

				files[side-1].matches[mi].side=win
				files[side-1].matches[mi].result1=result1
				files[side-1].matches[mi].result2=result2
				files[side-1].matches[mi].resultPenalty1=resultPenalty1
				files[side-1].matches[mi].resultPenalty2=resultPenalty2
				files[side-1].matches[mi].scoreHome=result1
				files[side-1].matches[mi].scoreAway=result2
				files[side-1].matches[mi].scorePenaltyHome=resultPenalty1
				files[side-1].matches[mi].scorePenaltyAway=resultPenalty2
				files[side-1].matches[mi].points1=points1
				files[side-1].matches[mi].points2=points2
				files[side-1].matches[mi].rank1=rank1
				files[side-1].matches[mi].rank2=rank2
				files[side-1].matches[mi].venueName=m.venueName.trim()
				files[side-1].matches[mi].winType=win
				files[side-1].matches[mi].win=win*diff
				files[side-1].matches[mi].diff=diff

			})

			let mrows = container.selectAll('tr').data(files[side-1].matches.filter((d,i)=>(i<10)?true:false)).enter().append('tr')

			for(let i = 0; i<7; i++){
				let ii = i;
				if(side == 1){
					ii = 6-i
				}
				switch(ii){
					case 6:
						mrows.append('td').html(d=>moment(d.matchDate).format('DD-MM-YYYY')+'<br />'+d.venueName)
					break;
					case 5:
						mrows.append('td').html(d=>importance[d.cupKindID][1]+'<br />Weight:'+importance[d.cupKindID][0]+'')
					break;
					case 4:
						mrows.append('td').attr('class', d=>(side==1)?'gm-opponent':'gm-team').text(d=>(files[side-1].id == d.idAwayTeam)?d.tHname:d.tAname)
					break;
					case 3:
						mrows.append('td').attr('class', 'gm-score1').text(d=>calcResult(d)[1])
					break;
					case 2:
						mrows.append('td').attr('class','gm-compare').append('svg')
							.attr('width', 30)
							.attr('height', 30)
							.append('g')
							.datum(d=>{
								return {
									rank1:(side==1)?d.rank2:d.rank1,
									rank2:(side==1)?d.rank1:d.rank2
								};
							})
							.call(buildIcon, 30, true, true)
					break;
					case 1:
						mrows.append('td').attr('class', 'gm-score2').text(d=>calcResult(d)[0])
					break;
					case 0:
						mrows.append('td').attr('class', d=>(side==1)?'gm-team':'gm-opponent').text(d=>(files[side-1].id == d.idAwayTeam)?d.tAname:d.tHname)
					break;
				}
			}

			mds_container[side-1] = d3.select('#game-mds'+side+'')
			mds_container[side-1].selectAll('*').remove()

			mds_width = (mds_container[side-1].node().getBoundingClientRect()).width

			win_extent[side-1] = d3.extent(files[side-1].matches, d=>d.win*-1)
			rank_extent[side-1] = d3.extent(files[side-1].matches, d=>(d.rank1-d.rank2))
			mds_color_scale[side-1] = d3.scaleLinear().range(['#FF1560','#0E85F2']).domain([win_extent[side-1][1],win_extent[side-1][0]])
			mds_x_scale[side-1] = d3.scaleLinear().range([0, mds_width-2*mds_margin]).domain(rank_extent[side-1])
			mds_y_scale[side-1] = d3.scaleLinear().range([0, mds_height-2*mds_margin]).domain([win_extent[side-1][1],win_extent[side-1][0]])
			mds_r_scale[side-1] = d3.scaleLinear().range([3,6]).domain([1,5])
			mds_x_axis[side-1] = d3.axisBottom().scale(mds_x_scale[side-1])
			mds_y_axis[side-1] = d3.axisLeft().scale(mds_y_scale[side-1]).ticks((win_extent[side-1][1]-win_extent[side-1][0]+1))

			mds_container[side-1].append('span').html(((side==1)?'':files[side-1].name+'&nbsp;') + '<img src="./assets/flag-icon-css/4x3/'+teamCodes[files[side-1].id]+'.svg" />' + ((side==1)?'&nbsp;'+files[side-1].name:''))

			mds_svg[side-1] = mds_container[side-1].append('svg')
				.attr('width', mds_width)
				.attr('height', mds_height)

			mds_g[side-1] = mds_svg[side-1].append('g')
				.attr('transform', 'translate('+mds_margin+','+8+')')

			mds_y_axis_g[side-1] = mds_g[side-1].append('g')
				.attr('transform', 'translate(-5,0)')
				.call(mds_y_axis[side-1])

			mds_x_axis_g[side-1] = mds_g[side-1].append('g')
				.attr('transform', 'translate(0,'+(mds_height-2*mds_margin+5)+')')
				.call(mds_x_axis[side-1])

			mds_x_label[side-1] = mds_g[side-1].append('text')
				.text('Ranking difference')
				.attr('class', 'mds_legend')
				.attr('text-anchor', 'end')
				.attr('transform', 'translate('+(mds_width-2*mds_margin)+','+(mds_height-2*mds_margin+35)+')')

			mds_y_label[side-1] = mds_g[side-1].append('text')
				.text('Goal difference')
				.attr('class', 'mds_legend')
				.attr('text-anchor', 'end')
				.attr('y', -32)
				.style('transform', 'rotate(-90deg)')

			if(win_extent[side-1][0]<0 && win_extent[side-1][1]>0){
				mds_x_line[side-1] = mds_g[side-1].append('line')
					.attr('x1', 0)
					.attr('x2', mds_width-2*mds_margin)
					.attr('y1', mds_y_scale[side-1](0))
					.attr('y2', mds_y_scale[side-1](0))
					.style('stroke-dasharray', '2,2')
					.style('stroke', 'rgba(0,0,0,0.7)')

				mds_x_label1[side-1] = mds_g[side-1].append('text')
					.attr('class', 'mds_legend')
					.html('&darr;&nbsp;Lose')
					.attr('y',mds_y_scale[side-1](0)+14)

				mds_x_label2[side-1] = mds_g[side-1].append('text')
					.attr('class', 'mds_legend')
					.html('&uarr;&nbsp;Win')
					.attr('y',mds_y_scale[side-1](0)-7)
			}
			
			if(rank_extent[side-1][0] < 0 && rank_extent[side-1][1] > 0){
				mds_y_line[side-1] = mds_g[side-1].append('line')
					.attr('x1', mds_x_scale[side-1](0))
					.attr('x2', mds_x_scale[side-1](0))
					.attr('y1', 0)
					.attr('y2', mds_height-2*mds_margin)
					.style('stroke-dasharray', '2,2')
					.style('stroke', 'rgba(0,0,0,0.7)')

				mds_y_label1[side-1] = mds_g[side-1].append('text')
					.attr('text-anchor', 'end')
					.attr('class', 'mds_legend')
					.html('Stronger Team&nbsp;&darr;')
					.attr('y',mds_x_scale[side-1](0)+13)
					.style('transform', 'rotate(-90deg)')

				mds_y_label2[side-1] = mds_g[side-1].append('text')
					.attr('text-anchor', 'end')
					.attr('class', 'mds_legend')
					.html('Weaker Team&nbsp;&uarr;')
					.attr('y',mds_x_scale[side-1](0)-8)
					.style('transform', 'rotate(-90deg)')
			}

			mds_circles[side-1] = mds_g[side-1].selectAll('circle').data(files[side-1].matches).enter().append('circle')
				.attr('cx', d=>mds_x_scale[side-1]((d.rank1-d.rank2)))
				.attr('cy', d=>mds_y_scale[side-1](d.win*-1))
				.attr('r',d=>mds_r_scale[side-1](importance[d.cupKindID][0]))
				.style('fill', d=>mds_color_scale[side-1](d.win*-1))


			files[side-1].matches.forEach(m=>{
				let t1 = teams[team_keys[files[side-1].id]],
					t2 = teams[team_keys[files[((side==1)?1:0)].id]]

				let rank_dist = Math.abs((t2.rank-t1.rank)-(m.rank2-m.rank1)),
					time_dist = moment().diff(moment(m.matchDate))



			})

		})

		window.addEventListener("resize", debounce(()=>{

			rank_width = (body.node().getBoundingClientRect()).width

			root_svg.attr('width',rank_width)
				.attr("viewBox", "0 0 "+rank_width+" "+rank_height)

			rank_x_scale = d3.scaleTime()
				.range([0,rank_width-2*rank_margin])
				.domain([d3.min([d3.min(files[0].rankings, d=>d.date), d3.min(files[1].rankings, d=>d.date)]), d3.max([d3.max(files[0].rankings, d=>d.date), d3.max(files[1].rankings, d=>d.date)])])
				.nice()

			rank_x_axis = d3.axisBottom(rank_x_scale)
				.ticks(8)
			rank_x_grid = d3.axisBottom(rank_x_scale)
				.ticks(8)

			rank_line = d3.line()
				.x(d=>rank_x_scale(d.date))
				.y(d=>rank_y_scale(d.rankseq))

			x_axis.call(rank_x_axis)

			new Array(0,1).forEach((t,ti)=>{
				y_axis[ti].attr('transform', 'translate('+((ti==1)?(rank_width-2*rank_margin+5):-5)+',0)')
			})

			y_grid.call(rank_y_grid[0].tickSize(-(rank_width-2*rank_margin+10)).tickFormat(''))
			x_grid.call(rank_x_grid.tickSize(rank_height-2*rank_margin+5).tickFormat(''))

			homeLine.attr('d', rank_line)
			awayLine.attr('d', rank_line)

			int_rect.attr('width',rank_width-2*rank_margin)

			/*--- resize matches ---*/

			if(matches.length > 2){
				match_width = (hbody.node().getBoundingClientRect()).width
				match_width = (match_width<700)?700:match_width
				match_p_width = match_width - match_text_col*2

				rootg_svg.attr('width',match_width)
					.attr("viewBox", "0 0 "+match_width+" "+match_height)

				pathg.attr('transform', 'translate('+(match_width/2-match_margin)+',0)')

				arrowline.attr('x1', -match_p_width/2+10)
					.attr('x2', match_p_width/2-10)

				arrowleft.attr('transform', 'translate('+(-match_p_width/2+10)+','+(25-80)+')')
				arrowright.attr('transform', 'translate('+(match_p_width/2-10)+','+(25-80)+')')

				arrowTleft.attr('x', -match_p_width/2+30)
				arrowTRight.attr('x', match_p_width/2-30)

				if(sumDiff>0){
					legend.attr('transform', 'translate('+(-match_p_width/2)+',-80)')
						.attr('d', 'M0,25L25,50L'+(match_p_width-25)+',50L'+match_p_width+',25L'+(match_p_width-25)+',0L25,0L0,25Z')
				}

				match_x_scale.range([-match_p_width/2,match_p_width/2])
				match_line.x(d=>match_x_scale(d.win))

				if(sumDiff>0){
					matchp_path.data([matches]).attr('d', match_line)
				}

				icons.attr('transform', d=>'translate('+match_x_scale(d.win)+','+match_y_scale(d.c)+')')
				
				icon_lines.attr('x2',d=>d.side * (match_width/2-match_x_scale(Math.abs(d.win))-match_margin))

				matchp_result.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 10)+',0)')

				matchp_icon.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 60)+',-20)')

				matchp_rank1.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 85)+',-20)')
				matchp_rank2.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 85)+',-4)')

				matchp_meta1.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 115)+',-4)')
				matchp_meta2.attr('transform', d=>'translate('+d.side*(match_p_width/2 - match_x_scale(Math.abs(d.win)) + 115)+',-20)')
			}

			/*--- resize scatter ---*/

			new Array(1,2).forEach(side=>{
				mds_width = (mds_container[side-1].node().getBoundingClientRect()).width
				mds_x_scale[side-1].range([0, mds_width-2*mds_margin])

				mds_svg[side-1].attr('width', mds_width)

				mds_x_axis_g[side-1].call(mds_x_axis[side-1])
				mds_x_label[side-1].attr('transform', 'translate('+(mds_width-2*mds_margin)+','+(mds_height-2*mds_margin+35)+')')

				if(win_extent[side-1][0]<0 && win_extent[side-1][1]>0){
					mds_x_line[side-1]
						.attr('x2', mds_width-2*mds_margin)
						.attr('y1', mds_y_scale[side-1](0))
						.attr('y2', mds_y_scale[side-1](0))

					mds_x_label1[side-1].attr('y',mds_y_scale[side-1](0)+14)
					mds_x_label2[side-1].attr('y',mds_y_scale[side-1](0)-7)
				}
			
				if(rank_extent[side-1][0] < 0 && rank_extent[side-1][1] > 0){
					mds_y_line[side-1]
						.attr('x1', mds_x_scale[side-1](0))
						.attr('x2', mds_x_scale[side-1](0))
						.attr('y2', mds_height-2*mds_margin)

					mds_y_label1[side-1]
						.attr('y',mds_x_scale[side-1](0)+13)

					mds_y_label2[side-1]
						.attr('y',mds_x_scale[side-1](0)-8)
				}

				mds_circles[side-1]
					.attr('cx', d=>mds_x_scale[side-1]((d.rank1-d.rank2)))
					.attr('cy', d=>mds_y_scale[side-1](d.win*-1))
			})
		}), 250);

		window.addEventListener('scroll', ()=>{
			let hy = d3.select('#historic-head').node().getBoundingClientRect()
			
			if(hy.top<-147 && hy.top>(match_height*-1)){
				d3.select('#historic-floater').classed('fixed',true)
			}else{
				d3.select('#historic-floater').classed('fixed',false)
			}
		})

	}).catch(err=>{
		throw err
	})
}

function buildIcon(sel, size, translate=false, switchColor=false){
	let rankMax = 71,
		icon = sel.append('g')
			.attr('transform', (translate)?'translate('+size/2+', '+size/2+')':'')

	let area = Math.sqrt(Math.pow(size/2, 2)*2)

	let scale = d3.scaleLinear().range([0,Math.pow(area,2)]).domain([rankMax,0])

	icon.append('rect')
		.attr('width', area)
		.attr('height', area)
		.attr('x', -area/2)
		.attr('y', -area/2)
		.attr('class', 'match_icon_bg')
		.style('transform', 'rotate(45deg)')

	new Array(1,2).forEach(side=>{
		icon.append('path')
			.attr('class',(side==1)?((switchColor)?'match_icon_away':'match_icon_home'):((switchColor)?'match_icon_home':'match_icon_away'))
			.attr('d', d=>{
				let val = d['rank'+side]
				if(val>70) val = 71
				let len = Math.sqrt(scale(val)/2)
				return 'M0,-'+len+'L'+((side==1)?-1:1)*len+',0L0,'+len+'M0,-'+len+'Z'
			})
	})

	return icon
}

function calcResult(d){
	if(!d.scoreHome && !d.scoreAway && d.scorePenaltyHome == 0 && d.scorePenaltyAway == 0){
		return [0,0]
	}else if(d.scorePenaltyHome == 0 && d.scorePenaltyAway == 0){
		return [d.scoreHome, d.scoreAway]
	}else{
		return [d.scorePenaltyHome, d.scorePenaltyAway]
	}
}

buildDetails(43935,43942);

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function fitProjection(geometry) {
	// Fit geometry to screen
	// see http://bl.ocks.org/mbostock/4707858

	let width = (d3.select('#header').node().getBoundingClientRect()).width, height = 600

	projection
		.scale(1)
		.translate([0, 0]);

	var b = geopath.bounds(geometry),
      s = .70 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
    	t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
	
	projection
		.scale(s)
		.translate(t);
}

function degreesToRadians(degrees) { return degrees * Math.PI / 180; }
function radiansToDegrees(radians) { return radians * 180 / Math.PI; }