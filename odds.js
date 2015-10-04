var system = require("system");
var fs = require("fs");
var args = system.args.slice(1);
var url_head;
var season_urls = [];
var match_urls = [];
var match_odd_urls = [];
var part_match_odd_urls = new Array();
var cmd_args = {};
var current_match = new Object();
var current_match_fname;
var gmt_is_used = false;
var tz_gmt_url = "http://www.oddsportal.com/set-timezone/36/";
var jquery_lib_name = "jquery-2.1.1.min.js";
var odds_path = "d:/work/sport/odds/";
var match_url = "";

var name_codes = new Object();

name_codes["1X2"] = "1X2";
name_codes["Asian Handicap"] = "AH";
name_codes["Over/Under"] = "O/U";
name_codes["Draw No Bet"] = "DNB";
name_codes["European Handicap"] = "EH";
name_codes["Double Chance"] = "DC";
name_codes["Correct Score"] = "CS";
name_codes["Half Time / Full Time"] = "Half Time / Full Time";
name_codes["Odd or Even"] = "Odd or Even";
name_codes["Both Teams to Score"] = "Both Teams to Score";

var part_games = new Object();

part_games["Full Time"] = "2";
part_games["1st Half"] = "3";
part_games["2nd Half"] = "4";

var odd_refs = new Object();

odd_refs["1X2"] = new Object();
odd_refs["1X2"]["title"] = "1X2";
odd_refs["1X2"]["code"] = "1X2";

odd_refs["AH"] = new Object();
odd_refs["AH"]["title"] = "Asian Handicap";
odd_refs["AH"]["code"] = "ah";

odd_refs["O/U"] = new Object();
odd_refs["O/U"]["title"] = "Over/Under";
odd_refs["O/U"]["code"] = "over-under";

odd_refs["DNB"] = new Object();
odd_refs["DNB"]["title"] = "Draw No Bet";
odd_refs["DNB"]["code"] = "dnb";

odd_refs["EH"] = new Object();
odd_refs["EH"]["title"] = "European Handicap";
odd_refs["EH"]["code"] = "eh";

odd_refs["DC"] = new Object();
odd_refs["DC"]["title"] = "Double Chance";
odd_refs["DC"]["code"] = "double";

odd_refs["CS"] = new Object();
odd_refs["CS"]["title"] = "Correct Score";
odd_refs["CS"]["code"] = "cs";

odd_refs["HT/FT"] = new Object();
odd_refs["HT/FT"]["title"] = "Half Time / Full Time";
odd_refs["HT/FT"]["code"] = "ht-ft";

odd_refs["O/E"] = new Object();
odd_refs["O/E"]["title"] = "Odd or Even";
odd_refs["O/E"]["code"] = "odd-even";

odd_refs["Half Time / Full Time"] = new Object();
odd_refs["Half Time / Full Time"]["title"] = "Half Time / Full Time";
odd_refs["Half Time / Full Time"]["code"] = "ht-ft";

odd_refs["Odd or Even"] = new Object();
odd_refs["Odd or Even"]["title"] = "Odd or Even";
odd_refs["Odd or Even"]["code"] = "odd-even";

odd_refs["Both Teams to Score"] = new Object();
odd_refs["Both Teams to Score"]["title"] = "Both Teams to Score";
odd_refs["Both Teams to Score"]["code"] = "bts";

//var ah_odds = ["1X2", "DNB", "DC", "Odd or Even", "Both Teams to Score"];
//var multi_odds = ["AH", "O/U", "EH", "CS", "Half Time / Full Time"];

function print_error_message(text) {
	var dt = new Date();
	var month = dt.getMonth() + 1;
	var date_line = dt.getFullYear() + "-" + month + "-" + dt.getDate();
	var time_line = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + "." + dt.getMilliseconds();	
	fs.write("error.txt",  date_line + " " + time_line + ": " + text + "\n", "w+");
}

function simple_odds(page) {
	var json_obj = page.evaluate(function() {
		var a_items = $("div#odds-data-table table.table-main.detail-odds.sortable th.center.odds-odds a");
		var pos_results = new Array();
		$(a_items).each(function() {
			pos_results.push($(this).text());
		});
		var odds = new Object();
		var tr_items = new Array();
		tr_items.push($("div#odds-data-table table.table-main.detail-odds.sortable tr.aver"));
		tr_items.push($("div#odds-data-table table.table-main.detail-odds.sortable tr.highest"));
		for (var ix = 0; ix < tr_items.length; ix++) {
			var tr_item = tr_items[ix];
			var td_items = $(tr_item).find("td.right");
			var tr_name = $(tr_item).find("td.name strong").text();
			odds[tr_name] = new Object();
			var jx = 0;
			$(td_items).each(function() {
				odds[tr_name][pos_results[jx]] = $(this).text();
				jx++;
			});
		}
		return JSON.stringify(odds);
	});

	return json_obj;
}

function is_value_correct(value) {
	var re = /^(\+|\-)\d+/i;
	var found = value.match(re);
	return !found;
}

function multi_odds(page) {
	var json_obj = page.evaluate(function() {
		var a_items = $("div.table-chunk-header-dark div.table-chunk-header-cell.chunk-odd.nowrp a");
		var pos_results = new Array();
		$(a_items).each(function() {
			pos_results.push($(this).text());
		});
		var odds = new Object();
		var tr_items = $("div#odds-data-table div.table-container");
		$(tr_items).each(function() {
			var name = $(this).find("strong a").text();
			if (!name) {
				return true;
			}
			var span_items = $(this).find("span.avg.chunk-odd.nowrp");
			odds[name] = new Object();
			var jx = 0;
			$(span_items).each(function() {
				var a_items = $(this).find("a");
				var pos_result = pos_results[jx];
				odds[name][pos_result] = "";
				if (a_items.length > 0) {
					if (is_value_correct($(this).text())) {
						odds[name][pos_result] = $(this).text();
					}
					else {
						odds[name] = new Object();
						return false;
					}
				}
				jx++;
			});
		});
		return JSON.stringify(odds);
	});	
	return json_obj;	
}

function multi_simple_odds(page) {
	var json_obj = page.evaluate(function() {
		var odds = new Object();
		var tr_items = $("div#odds-data-table div.table-container");
		$(tr_items).each(function() {
			var name = $(this).find("strong a").text();
			if (!name) {
				return true;
			}			
			var a_items = $(this).find("span.avg.nowrp a");
			$(a_items).each(function() {
				odds[name] = $(this).text();
			});
		});
		return JSON.stringify(odds);
	});	
	return json_obj;	
}

function remove_name(odds, name) {
	var keys = Object.keys(odds);
	var pattern = name + " ([\\-\\+\\d\\.]+)";
	for (var ix = 0; ix < keys.length; ix++) {
		var re = new RegExp(pattern, "i");
		var found = keys[ix].match(re);
		odds[found[1]] = odds[keys[ix]];
		delete odds[keys[ix]];
	}
	return odds;	
}

var odd_recv = new Object();

odd_recv["1X2"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["AH"] = function(page) {
	var json_obj = multi_odds(page);
	var odds = JSON.parse(json_obj.toString());
	odds = remove_name(odds, odd_refs["AH"]["title"]);
	return JSON.stringify(odds);
}

odd_recv["O/U"] = function(page) {
	var json_obj = multi_odds(page);
	var odds = JSON.parse(json_obj.toString());
	odds = remove_name(odds, "Over/Under");	
	return JSON.stringify(odds);
}

odd_recv["DNB"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["EH"] = function(page) {
	var json_obj = multi_odds(page);
	var odds = JSON.parse(json_obj.toString());
	odds = remove_name(odds, "European handicap");	
	return JSON.stringify(odds);
}

odd_recv["DC"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["CS"] = function(page) {
	var json_obj = multi_simple_odds(page);
	return json_obj;
}

odd_recv["Half Time / Full Time"] = function(page) {
	var json_obj = multi_simple_odds(page);
	return json_obj;
}

odd_recv["Odd or Even"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["Both Teams to Score"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

function odds_page_title(page) {
	var title = page.evaluate(function() {
		var span_item = $("div#bettype-tabs ul.ul-nav li[class*=active] strong span");
		if (span_item.size() === 0) {
			return null;
		}
		return $(span_item).text();
	});
	return title;
}

function odds_parts_match(page) {
	var parts = page.evaluate(function() {
		var li_items = $("div#bettype-tabs-scope ul.sub-menu.subactive li");
		if (li_items.size() === 0) {
			return null;
		}		
		var parts_obj = new Object();
		parts_obj["no_active"] = new Array();
		$(li_items).each(function() {
			if ($(this).attr("class").indexOf("active") > -1) {
				parts_obj["active"] = $(this).find("span").text();
				return true;
			}
			parts_obj["no_active"].push($(this).find("span").text());
		});
		if (!("active" in parts_obj)) {
			return null;
		}
		return parts_obj;
	});
	
	return parts;
}


function odds_type_page_refs(page) {
	var refs = new Array();
	var names = page.evaluate(function() {
		var ul_item = $("div#bettype-tabs ul.ul-nav");
		var a_items = $(ul_item).find("li[style*=block] a");
		var names = new Array();
		$(a_items).each(function(url) {
			names.push($(this).find("span").text());
		});
		a_items = $(ul_item).find("li.r.more div.othersListParent p a");
		$(a_items).each(function(url) {
			names.push($(this).text());
		});		
		return names;
	});
	for (var ix = 0; ix < names.length; ix++) {
		if (names[ix] in odd_refs) {
			refs.push(odd_refs[names[ix]]["code"]);
		}
		else {
			print_error_message("ERROR: " + names[ix] + " code of odds is unknown.");
		}
	}
	
	return refs;
}

function obtain_match_info(page) {
	var title = odds_page_title(page);
	if (!title || title === "") {
		var msg_text = "ERROR: title isn't found.";
		print_error_message(msg_text);
		return false;
	}
	
	var info = page.evaluate(function() {
		var info = new Object();
		var div_item = $("div#main div#col-content");
		info.teams = new Array();
		var teams_line = $(div_item).find("h1").text();
		var re = /([\w\s]+)\s+\-\s+([\w\s]+)/i;
		var found = teams_line.match(re);
		if (found && found.length === 3) {		
			info.teams.push(found[1]);
			info.teams.push(found[2]);
		}
		var date_line = $(div_item).find("p[class*=date]").text();
		info.date = new Date(date_line);
		info.score = new Object();
		var p_item = $(div_item).find("p.result");
		info.score.ft = $(p_item).find("strong").text().split(":");
		var parts_line = $(p_item).text();
		re = /\((\d+:\d+)\,\s+(\d+:\d+)\)/i;
		found = parts_line.match(re);
		if (found && found.length === 3) {
			info.score.ht_1 = found[1].split(":");
			info.score.ht_2 = found[2].split(":");			
		}
		return info;
	});
	current_match.host = {"name": info.teams[0]};
	current_match.guest = {"name": info.teams[1]};
	current_match.dt = {"date": info.date.getUTCFullYear() + "-" + info.date.getUTCMonth() + "-" + info.date.getUTCDate(),
						"time": info.date.getUTCHours() + ":" + info.date.getUTCMinutes()}
	current_match.host.score = {"ft": info.score.ft[0], "parts": [info.score.ht_1[0], info.score.ht_2[0]]};
	current_match.guest.score = {"ft": info.score.ft[1], "parts": [info.score.ht_1[1], info.score.ht_2[1]]};
	current_match.odds = new Object();
	

	current_match.odds[name_codes[title]] = new Object();

	var refs = new Array();
	var names = page.evaluate(function() {
		var ul_item = $("div#bettype-tabs ul.ul-nav");
		var a_items = $(ul_item).find("li[style*=block] a");
		var names = new Array();
		$(a_items).each(function(url) {
			names.push($(this).find("span").text());
		});
		a_items = $(ul_item).find("li.r.more div.othersListParent p a");
		$(a_items).each(function(url) {
			names.push($(this).text());
		});		
		return names;
	});
	for (var ix = 0; ix < names.length; ++ix) {
		if (names[ix] in odd_refs) {
			refs.push(names[ix]);
		}
		else {
			print_error_message("ERROR: " + names[ix] + " code of odds is unknown.");
		}
	}
	
	for (var ix = 0; ix < refs.length; ++ix) {
		current_match.odds[refs[ix]] = new Object();
	}
	
	return true;
}

function add_url_head(urls, hrefs, head) {
	for (var ix = 0; ix < hrefs.length; ix++) {
		urls.push(head + hrefs[ix]);
	}
	return urls;
}

function convert_to_text(line) {
	return line.replace(/\u00a0/g, " ")
}

function save_urls_to_file(fname, urls) {
	fs.write(fname, "", "w");
	for (var ix = 0; ix < urls.length; ix++) {
		fs.write(fname, urls[ix] + "\n", "w+");
	}	
}

function load_results(url, callback) {
	var results_page = require("webpage").create();
	results_page.open(url, function (status) {
		if (status === "success") {
			console.log("Loaded: " + url);
			var a = document.createElement("a");
			a.href = url;
			url_head = a.protocol + "//" + a.host;
			//fs.write("content.html", results_page.content, "w");
			results_page.injectJs(jquery_lib_name);
			var hrefs = results_page.evaluate(function() {
				var links = $("td.name.table-participant a");
				var hrefs = [];
				$(links).each(function() {
					hrefs.push($(this).attr("href"));
				});
				return hrefs;
			});
			add_url_head(match_urls, hrefs, url_head);
			console.log("Loaded " + match_urls.length.toString() + " match urls.");
			if (url === cmd_args["season_url"]) {
				page_hrefs = results_page.evaluate(function() {
					var pages = $("div#pagination a");
					var hrefs = [];
					$(pages).each(function() {
						if (!$(this).find("span.arrow").length) {
							hrefs.push($(this).attr("href"));
						}
					});
					return hrefs;
				});
				for (ix = 0; ix < page_hrefs.length; ix++) {
					page_url = url_head + page_hrefs[ix];
					season_urls.push(page_url);					
				}				
			}
			callback.apply();
		}
		else {
			fs.write("error.txt", "URL: " + url + "\n", "w");
			fs.write("error.txt", "Open Status: " + status + "\n", "w+");		
		}
	});
}

function call_callback(callback) {
	setTimeout(function() {
		callback.apply();
	}, 5000);
}

function save_odds(url, callback) {
	var odds_page = require("webpage").create();
	var start_time = Date.now();
	odds_page.open(url, function (status) {
		if (status === "success") {
			var dur = Date.now() - start_time;
			console.log("Loaded: " + url);			
			console.log("Load Time: " + dur + " msec.");
			odds_page.injectJs(jquery_lib_name);
			if (url === current_match["source"]) {
				if (!obtain_match_info(odds_page)) {
					call_callback(callback);
					return false;				
				}
			}
			
			var title = odds_page_title(odds_page);
			if (!title || title === "") {
				var msg_text = "ERROR: title isn't found.";
				print_error_message(msg_text);
				call_callback(callback);
				return false;
			}
			console.log("Title: " + title);			
			var parts = odds_parts_match(odds_page);
			if (!parts) {
				var msg_text = title + "ERROR: parts of match aren't found.";
				print_error_message(msg_text);
				call_callback(callback);
				return false;
			}		
			for (var ix = 0; ix < parts["no_active"].length; ix++) {			
				var pg = convert_to_text(parts["no_active"][ix]);
				console.log('pg: ' + pg);
				console.log('name_codes[' + title + ']: ' + name_codes[title])
				if (!current_match.odds[name_codes[title]].hasOwnProperty(pg)) {
					current_match.odds[name_codes[title]][pg] = new Object();
				}
			}			
			
			console.log("URL: " + url);
			var json_odds = odd_recv[name_codes[title]](odds_page);
			var odds = JSON.parse(json_odds.toString());
			var active_part = convert_to_text(parts.active);
			console.log("active_part: " + active_part);			
			current_match["odds"][name_codes[title]][active_part] = odds;
			var json_obj = JSON.stringify(current_match);
			//console.log("current_match: " + json_obj.toString());
			fs.write(current_match_fname, json_obj.toString(), "w");

			call_callback(callback);
		}
		else {
			fs.write("error.txt", "URL: " + url + "\n", "w");
			fs.write("error.txt", "Open Status: " + status + "\n", "w+");		
			return false;
		}
	});
	
	return true;
}

function set_gmt_timezone(callback) {
	for (var ix = 0; ix < phantom.cookies.length; ++ix) {			
		if (phantom.cookies[ix]["domain"] === "www.oddsportal.com" &&
				phantom.cookies[ix]["name"] === "op_user_full_time_zone" &&
				phantom.cookies[ix]["value"] === "36") {
			console.log("GMT from COOKIE.");
			gmt_is_used = true;
			callback.apply();
			return true;
		}	
	}

	var tz_page = require("webpage").create();
	tz_page.open("http://www.oddsportal.com/set-timezone/36/", function (status) {
		if (status === "success") {
			gmt_is_used = true;
			console.log("GMT from INTERNET.");
			callback.apply();
		}
		else {
			fs.write("error.txt", "URL: " + tz_gmt_url + "\n", "w");
			fs.write("error.txt", "Open Status: " + status + "\n", "w+");		
		}
	});
}

function process() {
	if (season_urls.length > 0) {
		var url = season_urls[0];
        season_urls.splice(0, 1);		
		load_results(url, process);
	}
	else {
		save_urls_to_file("matches.lst", match_urls);
		phantom.exit();
	}
}

// http://www.oddsportal.com/set-timezone/36/
// http://www.oddsportal.com/soccer/russia/premier-league-2013-2014/cska-moscow-lokomotiv-moscow-4dkVegAE#ah
// http://www.oddsportal.com/soccer/england/premier-league-2013-2014/tottenham-aston-villa-GMHf4Iza/
// http://www.oddsportal.com/soccer/germany/bundesliga-2011-2012/hamburger-hannover-MZsVFpPR/
// http://www.oddsportal.com/soccer/austria/tipp3-bundesliga-2012-2013/salzburg-wacker-innsbruck-rBrmt00P/

function load_odd_sources(url) {
	if (!(fs.exists(odds_path) && fs.isDirectory(odds_path))) {
		console.log(odds_path + " path doesn't exist.");
		return false;
	}
	var re = /([\w\d\-\#\;]+)/g;
	var found = url.match(re);
	if (!(found && found.length > 4)) {
		console.log(url + " URL is wrong.");
		return false;
	}
	found.splice(0, 4);
	var last_ix = found.length - 1;
	if (found[last_ix].indexOf("#") > -1) {
		found.splice(last_ix, 1);
	}	
	var path = odds_path;
	for (var ix = 0; ix < found.length - 1; ++ix) {
		path += found[ix] + "/";
		if (!fs.exists(path)) {
			fs.makeDirectory(path);
		}
	}
	var files_lst = fs.list(path);
	var fname = found[found.length - 1] + ".json"
	current_match_fname = path + fname;
	if (files_lst.indexOf(fname) > -1) {
		console.log(current_match_fname + " file exists.");
		var content = "";
		content = fs.read(current_match_fname);
		current_match = JSON.parse(content);
	}
	
	return true;
}

function read_config_values() {
	var env = system.env;
	Object.keys(env).forEach(function(key) {
		console.log(key + '=' + env[key]);
	});
}

function get_odds_source() {
	if (!current_match.hasOwnProperty('odds')) {
		return current_match.source;
	}
	var keys = Object.keys(current_match.odds);
	console.log("get_odds_source: " + keys);		
	if (keys.length === 0) {
		return current_match.source;
	}
	for (var ix = 0; ix < keys.length; ++ix) {
		var k = keys[ix];
		console.log("k: " + k);
		var sub_keys = Object.keys(current_match.odds[k]);
		if (sub_keys.length === 0) {
			return current_match.source + "#" + odd_refs[k]["code"];
		}
		else {
			for (var jx = 0; jx < sub_keys.length; ++jx ) {
				var sub_k = sub_keys[jx];
				var odd_names = Object.keys(current_match.odds[k][sub_k]);
				if (odd_names.length === 0)
					return current_match.source + "#" + odd_refs[k]["code"] + ";" + part_games[sub_k];
			}
		}
	}
	
	return false;
}

function process_match_url() {
	if (!gmt_is_used) {
		set_gmt_timezone(process_match_url);
		console.log("GMT Timezone was set.");		
		return true;
	}
	if (match_url) {
		load_odd_sources(match_url)	
		save_odds(match_url, process_match_url);
		match_url = "";
	}
	else {
		save_urls_to_file("match_odd_urls.lst", match_odd_urls);
		phantom.exit();
	}
}

function main() {
	read_config_values();
	phantom.exit();
	if (args.length === 0) {
		console.log("No arguments.");
		console.log("Using: phantomjs odds.js <url>");
		phantom.exit();
	}			
	
	match_url = args[0];
	current_match.source = args[0]
	process_match_url();
}

main();
