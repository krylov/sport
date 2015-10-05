var system = require("system");
var fs = require("fs");
var args = system.args.slice(1);
var url_head;
var cmd_args = {};
var current_match = new Object();
var current_match_fname;
var current_season = new Object();
var current_season_fname;
var jquery_lib_name = "jquery-2.1.1.min.js";
var match_url = "";
var season_url = "";
var sport_path_key = "SPORT_PATH";
var odds_path_key = "ODDS_PATH";
var SPORT_PATH = "";
var ODDS_PATH = "";
var ODDS_FOLDER = "odds";
var ODDS_JSON_CONFIG = "odds.cfg.json";
var ERROR_LOG = "error.log";
var SCREENSHOTS_FOLDER = "screenshots";
var ODDS_FORMAT = "EU Odds";
var ODDS_PORTAL = "http://www.oddsportal.com/";
var bet_types;

function format_date(v, sz) {
	var n_zeros = sz - v.toString().length;
	z_line = "";
	while (n_zeros) {
		z_line += "0";
		--n_zeros;
	}

	return z_line + v;
}

function make_screenshot(page, details) {
	var re = /([\w\d\-\#\;]+)/g;
	var found = page.url.match(re);
	if (!(found && found.length > 4)) {
		console.log(url + " URL is wrong.");
		return false;
	}
	
	found.splice(0, 7);
	var last_ix = found.length - 1;
	if (found[last_ix].indexOf("#") > -1) {
		found.splice(last_ix, 1);
	}
	
	var details_line = "";
	for (var key in details) {
		if (key === "page") {
			continue;
		}
		details_line += details[key] + ".";
	}
	
	var path = SPORT_PATH + SCREENSHOTS_FOLDER + "/" + found[0] + "." + details_line + "png";
	page.render(path);
	return path;
}

function print_error_message(text, details) {
	var dt = new Date();
	var year = format_date(dt.getFullYear(), 4);
	var month = format_date(dt.getMonth() + 1, 2);
	var day = format_date(dt.getDate(), 2);
	var hours = format_date(dt.getHours(), 2);
	var minutes = format_date(dt.getMinutes(), 2);
	var seconds = format_date(dt.getSeconds(), 2);
	var msec = format_date(dt.getMilliseconds(), 3);
	var date_line = year + "-" + month + "-" + day;
	var time_line = hours + ":" + minutes + ":" + seconds + "." + msec;
	var screenshot_path = "";
	if (details && details.hasOwnProperty("page")) {
		details["datetime"] = year + month + day + "_" + hours + minutes + seconds + "_" + msec;
		screenshot_path = make_screenshot(details.page, details);
	}
	var full_message = date_line + " " + time_line + ": " + text;
	full_message += "(";
	if (screenshot_path) {
		full_message += "screenshot: " + screenshot_path + "; ";
	}
	if (details && details.hasOwnProperty("page")) {
		full_message += "url: " + details.page.url;
	}
	else {
		full_message += "no details about url";
	}
	full_message += ")";
	fs.write(SPORT_PATH + ERROR_LOG, full_message + "\n", "w+");
}

function odds_format(page) {
	var format_name = page.evaluate(function() {
		var format_name = $("div#header div#user-header a#user-header-oddsformat-expander span").text(); 
		return format_name;
	});
	return format_name;
}

// Config Functions: BEGIN
function parse_value(v) {
	if (typeof v === 'undefined') {
		return true;
	} else {
		try {
			return JSON.parse(v);
		} catch (e) {
			return v;
		}	
	}
}

function parse_arguments(args) {
	return args.reduce(function(prev, current) {
		current = current.split('=');
		current[0] = current[0].replace(/^--/, '');
		prev[current[0]] = parse_value(current[1]);
		return prev;
	}, {});
}


function read_env() {
	var env = system.env;
	
	if (sport_path_key in env) {
		SPORT_PATH = env[sport_path_key];
	}
	else {
		console.log(sport_path_key + " variable is absent in environment.");
		return false;
	}
	
	if (odds_path_key in env) {
		ODDS_PATH = env[odds_path_key];
	}	
	else {
		console.log(odds_path_key + " variable is absent in environment.");
		return false;
	}
	return true;
}

function print_bet_types() {
	if (!bet_types) {
		console.log("bet_types is NULL.");
	}
	var titles = Object.keys(bet_types);
	for (var ix = 0; ix < titles.length; ++ix) {
		console.log(titles[ix]);
		vars = Object.keys(bet_types[titles[ix]]);
		for (var jx = 0; jx < vars.length; ++jx) {
			console.log("  " + vars[jx] + " = " + bet_types[titles[ix]][vars[jx]]);
		}
	}
}

function print_object(obj) {
	var keys = Object.keys(obj);
	for (var ix = 0; ix < keys.length; ++ix) {
		console.log(keys[ix] + " = " + obj[keys[ix]]);
	}
}

function read_config_values() {
	var config_json = SPORT_PATH + ODDS_JSON_CONFIG;
	if (!fs.exists(config_json)) {
		console.log(config_json + " file is absent.");
		return false;
	}
	content = fs.read(config_json);
	bet_types = JSON.parse(content);
	return true;
}

function short_title_array() {
	if (!bet_types) {
		console.log("bet_types is NULL.");
		return false;
	}

	var st = new Object();
	var titles = Object.keys(bet_types);
	for (var ix = 0; ix < titles.length; ++ix) {
		if ("short" in bet_types[titles[ix]]) {
			st[bet_types[titles[ix]]["short"]] = titles[ix];
		}
		else {
			console.log(titles[ix] + "section: 'short' parameter is absent in the config.");
		}
	}
	
	return st;
}

function pairs(key_name, value_name) {
	if (!bet_types) {
		console.log("bet_types is NULL.");
		return false;
	}

	var arr = new Object();
	var titles = Object.keys(bet_types);
	for (var ix = 0; ix < titles.length; ++ix) {
		var key = "";
		if (key_name in bet_types[titles[ix]]) {
			key = bet_types[titles[ix]][key_name];
		}
		else {
			console.log(titles[ix] + "section: '" + key_name + "' parameter is absent in the config.");
			return false;
		}
		var value = "";		
		if (value_name in bet_types[titles[ix]]) {
			value = bet_types[titles[ix]][value_name];
		}
		else {
			console.log(titles[ix] + "section: '" + value_name + "' parameter is absent in the config.");
			return false;
		}		
		arr[key] = value;
	}
	
	return arr;	
}
// Config Functions: END

function remove_empty_values(odds) {
	var tr_names = Object.keys(odds);
	for (var ix = 0; ix < tr_names.length; ++ix) {
		var tr_name = tr_names[ix];
		var keys = Object.keys(odds[tr_name]);
		var line_is_empty = true;
		for (var jx = 0; jx < keys.length; ++jx) {
			var key = keys[jx];
			if (odds[tr_name][key] != "" && odds[tr_name][key] != "-") {
				line_is_empty = false;
			}
		}
		if (line_is_empty) {
			delete odds[tr_name];
		}
	}
	return odds;
}

function simple_odds(page) {
	var odds = page.evaluate(function() {
		var a_items = $("div#odds-data-table table.table-main.detail-odds.sortable th.center.odds-odds a");
		var pos_results = new Array();
		$(a_items).each(function() {
			pos_results.push($(this).text());
		});
		var odds = new Object();
		var tr_items = new Array();
		tr_items.push($("div#odds-data-table table.table-main.detail-odds.sortable tr.aver"));
		tr_items.push($("div#odds-data-table table.table-main.detail-odds.sortable tr.highest"));
		for (var ix = 0; ix < tr_items.length; ++ix) {
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
		return odds;
	});
	remove_empty_values(odds);

	return JSON.stringify(odds);
}

function is_value_correct(value) {
	var re = /^(\+|\-)\d+/i;
	var found = value.match(re);
	return !found;
}

function multi_odds(page) {
	var odds = page.evaluate(function() {
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
					odds[name][pos_result] = $(this).text();				
				}
				jx++;
			});
		});
		return odds;
	});	
	remove_empty_values(odds);
	
	return JSON.stringify(odds);	
}

function multi_simple_odds(page) {
	var odds = page.evaluate(function() {
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
		return odds;
	});
	
	var keys = Object.keys(odds);
	for (var ix = 0; ix < keys.length; ++ix) {
		var key = keys[ix];
		if (odds[key] == "") {
			delete odds[key];
		}
	}
	
	return JSON.stringify(odds);	
}

// Remove name from site title.
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

odd_recv["ah"] = function(page) {
	var json_obj = multi_odds(page);
	if (!json_obj) {
		return false;
	}
	var odds = JSON.parse(json_obj.toString());
	var code_full = pairs("code", "full");
	odds = remove_name(odds, code_full["ah"]);
	return JSON.stringify(odds);
}

odd_recv["over-under"] = function(page) {
	var json_obj = multi_odds(page);
	if (!json_obj) {
		return false;
	}	
	var odds = JSON.parse(json_obj.toString());
	var code_full = pairs("code", "full");
	odds = remove_name(odds, code_full["over-under"]);	
	return JSON.stringify(odds);
}

odd_recv["dnb"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["eh"] = function(page) {
	var json_obj = multi_odds(page);
	if (!json_obj) {
		return false;
	}	
	var odds = JSON.parse(json_obj.toString());
	var code_full = pairs("code", "full");
	odds = remove_name(odds, code_full["eh"]);	
	return JSON.stringify(odds);
}

odd_recv["double"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["cs"] = function(page) {
	var json_obj = multi_simple_odds(page);
	return json_obj;
}

odd_recv["ht-ft"] = function(page) {
	var json_obj = multi_simple_odds(page);
	return json_obj;
}

odd_recv["odd-even"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["bts"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

odd_recv["home-away"] = function(page) {
	var json_obj = simple_odds(page);
	return json_obj;
}

function odds_page_title(page) {
	var title = page.evaluate(function() {
		var span_item = $("div#bettype-tabs ul.ul-nav li[class*=active] strong span");
		if (span_item.size() === 0) {
			return "";
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

function obtain_match_info(page, title) {
	var info = page.evaluate(function() {
		var info = new Object();
		var div_item = $("div#main div#col-content");
		info.teams = new Array();
		var teams_line = $(div_item).find("h1").text();
		var re = /([\w\s\.]+)\s+\-\s+([\w\s\.]+)/i;
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
	var year = format_date(info.date.getFullYear(), 4);
	var month = format_date(info.date.getMonth() + 1, 2);
	var day = format_date(info.date.getDate(), 2);
	var hours = format_date(info.date.getHours(), 2);
	var minutes = format_date(info.date.getMinutes(), 2);	
	current_match.dt = {"date": year + "-" + month + "-" + day,
						"time": hours + ":" + minutes,
						"offset": info.date.getTimezoneOffset()}										
	current_match.host.score = {"ft": info.score.ft[0]};
	current_match.guest.score = {"ft": info.score.ft[1]};
	if (info.score.hasOwnProperty("ht_1")) {
		current_match.host.score["parts"] = [info.score.ht_1[0]];
		current_match.guest.score["parts"] = [info.score.ht_1[1]];
	}
	if (info.score.hasOwnProperty("ht_2")) {
		current_match.host.score["parts"].push(info.score.ht_2[0]);
		current_match.guest.score["parts"].push(info.score.ht_2[1]);	
	}	
	
	current_match.odds = new Object();
	current_match.odds[bet_types[title]["code"]] = new Object();

	var names = page.evaluate(function() {
		var ul_item = $("div#bettype-tabs ul.ul-nav");
		var a_items = $(ul_item).find("li[style*=block] a");
		var shorts = new Array();
		$(a_items).each(function(url) {
			shorts.push($(this).find("span").text());
		});
		var fulls = new Array();
		a_items = $(ul_item).find("li.r.more div.othersListParent p a");
		$(a_items).each(function(url) {
			fulls.push($(this).text());
		});		
		return [shorts, fulls];
	});
	if (!names) {
		var msg = "ERROR: odds names are not obtained.";
		return {"ok": false, "message": msg};	
	}
	
	var short_code = pairs("short", "code");
	for (var ix = 0; ix < names[0].length; ++ix) {
		var key = names[0][ix];
		if (key in short_code) {
			current_match.odds[short_code[key]] = new Object();
		}
		else {
			var msg = "ERROR: '" + key + "' short name of odds is absent in config.";
			return {"ok": false, "message": msg};
		}
	}	
	var full_code = pairs("full", "code");		
	for (var ix = 0; ix < names[1].length; ++ix) {
		var key = names[1][ix];
		if (key in full_code) {
			current_match.odds[full_code[key]] = new Object();
		}
		else {
			var msg = "ERROR: '" + key + "' full name of odds is absent in config.";
			return {"ok": false, "message": msg};
		}
	}	
	
	return {"ok": true};
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

function page_value(url) {
	var re = /([\w\d\-]+)/g;
	var found = url.match(re);
	if (!found) {
		print_error_message(url + " URL is wrong.");
		return 0;
	}
	var page_ix = found.indexOf("page");
	if (page_ix > -1) {
		return found[found.length - 1];
	}
	return 0;
}

function call_callback(callback) {
	setTimeout(function() {
		callback.apply();
	}, 0);
}

function send_ajax_request(url) {
	var page = require("webpage").create();
	page.open(url, function (status) {
		if (status === "success") {
			console.log(url + " was sent.");
			phantom.exit();			
		}
		else {
			print_error_message("ERROR: " + url + " URL is not load; open status is " + status);
		}
	});
}

function open_portal(format_id) {
	var portal_page = require("webpage").create();
	portal_page.open(ODDS_PORTAL, function (status) {
		if (status === "success") {
			console.log(ODDS_PORTAL + " was loaded.");
			send_ajax_request(ODDS_PORTAL + "ajax-set-cookie/OddsFormatID/" + format_id + "/");
		}
		else {
			print_error_message("ERROR: " + url + " URL is not load; open status is " + status);
			return false;		
		}
	});
}

function load_season_url(url, callback) {
	var results_page = require("webpage").create();
	results_page.open(url, function (status) {
		if (status === "success") {
			console.log("Loaded: " + url);
			results_page.injectJs(jquery_lib_name);	
			var current_page_ix = 1;	
			if (url === current_season.source) {
				var last_href = results_page.evaluate(function() {
					var a_items = $("div#pagination a");
					var page_hrefs = new Array();
					var href = "";
					$(a_items).each(function() {
						if ($(this).find("span.arrow").text() === "»|") {
							href = $(this).attr("href");
							return true;
						}
					});
					return href;
				});
				var n_pages = page_value(last_href);
				current_season.pages = new Array();
				for (var ix = 0; ix < n_pages; ++ix) {
					current_season.pages.push(false);
				}
				//if (n_pages > 0) {
				//	current_season.match_sources = new Object();
				//	console.log("match_sources is empty.");
				//}
				current_season.match_sources = new Object();
				console.log("match_sources is empty.");
			}
			else {
				current_page_ix = page_value(url);
			}
			
			var a = document.createElement("a");
			a.href = url;
			url_head = a.protocol + "//" + a.host;			
			
			var hrefs = results_page.evaluate(function() {
				var links = $("td.name.table-participant a");
				var hrefs = [];
				$(links).each(function() {
					hrefs.push($(this).attr("href"));
				});
				return hrefs;
			});
			var match_urls = new Array();
			add_url_head(match_urls, hrefs, url_head);
			
			for (var ix = 0; ix < match_urls.length; ++ix) {
				if (match_urls[ix] in current_season.match_sources) {
					continue;
				}
				current_season.match_sources[match_urls[ix]] = false;
			}

			current_season.pages[current_page_ix - 1] = true;
			
			var json_obj = JSON.stringify(current_season);
			fs.write(current_season_fname, json_obj.toString(), "w");
			current_season = {};			
						
			season_url = "";
			callback.apply();
		}
		else {
			print_error_message("ERROR: " + url + " URL is not load; open status is " + status);
			return false;
		}
	});
}


function load_match_url(url, callback) {
	var odds_page = require("webpage").create();
	var start_time = Date.now();
	odds_page.open(url, function (status) {
		if (status === "success") {
			var dur = Date.now() - start_time;
			console.log("Loaded: " + url);			
			console.log("Load Time: " + dur + " msec.");
			match_url = "";
			odds_page.injectJs(jquery_lib_name);
			var format = odds_format(odds_page);
			if (format.indexOf(ODDS_FORMAT) == -1) {
				var details = {"page": odds_page};
				print_error_message("WARNING: current odds format is '" + format + "'; expected format - '" + ODDS_FORMAT + "'", details);
				call_callback(callback);
				return false;
			}
			
			var title = odds_page_title(odds_page);
			if (!title) {
				var details = {"page": odds_page};			
				print_error_message("WARNING: title is not found.", details);
				call_callback(callback);
				return false;
			}
			
			if (url === current_match.source) {
				var info_obj = obtain_match_info(odds_page, title);
				if (!info_obj.ok) {
					var details = {"page": odds_page, "title": title};
					print_error_message(info_obj.message, details);
					call_callback(callback);
					return false;				
				}
			}
			
			var parts = odds_parts_match(odds_page);
			if (!parts) {
				var msg = "WARNING: parts of match are not found.";
				var details = {"page": odds_page, "title": title};
				print_error_message(msg, details);
				call_callback(callback);
				return false;
			}		
			for (var ix = 0; ix < parts["no_active"].length; ix++) {			
				var pg = convert_to_text(parts["no_active"][ix]); // replace url encoded space with real space
				var code = bet_types[title]["code"];
				if (!current_match.odds[code].hasOwnProperty(pg)) {
					current_match.odds[code][pg] = new Object();
				}
			}			
			
			var code = bet_types[title]["code"];
			var json_odds = odd_recv[code](odds_page);
			if (!json_odds) {
				console.log("NO json_odds.");
				var msg_text = "odds are not correct.";
				print_error_message(msg_text);
				call_callback(callback);
				return false;
			}
			var odds = JSON.parse(json_odds.toString());
			var active_part = convert_to_text(parts.active);
			current_match["odds"][code][active_part] = odds;
			var json_obj = JSON.stringify(current_match);
			fs.write(current_match_fname, json_obj.toString(), "w");
			current_match = {};

			call_callback(callback);
		}
		else {
			print_error_message("ERROR: " + url + " URL is not load; open status is " + status);			
			return false;
		}
	});
	
	return true;
}

function load_current_season(url) {
	var odds_path = ODDS_PATH;
	console.log("odds_path: " + odds_path);
	if (!(fs.exists(odds_path) && fs.isDirectory(odds_path))) {
		return false;
	}
	var re = /([\w\d\-]+)/g;
	var found = url.match(re);
	if (!(found && found.length > 4)) {
		console.log(url + " URL is wrong.");
		return false;
	}
	found.splice(0, 4);
	var page_ix = found.indexOf("page");
	if (page_ix > -1) {
		found.splice(page_ix, 2);
	}
	else {
		current_season.source = url;
	}
	
	if (found.indexOf("results") > -1) {
		found.splice(found.length - 1, 1);
	}
	else {
		console.log(url + " URL is wrong: 'results' is absent.");
		return false;	
	}

	for (var ix = 0; ix < found.length - 1; ++ix) {
		odds_path += found[ix] + "/";
		if (!fs.exists(odds_path)) {
			fs.makeDirectory(odds_path);
		}
	}

	var files_lst = fs.list(odds_path);
	var fname = found[found.length - 1] + ".json";
	current_season_fname = odds_path + fname;
	console.log("current_season_fname : " + current_season_fname);
	if (files_lst.indexOf(fname) > -1) {
		var content = fs.read(current_season_fname);
		current_season = JSON.parse(content);
		console.log("current_season was parsed.");
	}
	
	return true;	
}

function load_current_match(url) {
	var odds_path = ODDS_PATH;
	if (!(fs.exists(odds_path) && fs.isDirectory(odds_path))) {
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
	else {
		current_match.source = url;
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
		var content = fs.read(current_match_fname);
		current_match = JSON.parse(content);
	}
	
	return true;
}

function process_season_url() {
	if (season_url) {
		load_current_season(season_url);	
		load_season_url(season_url, process_season_url);
	}
	else {
		phantom.exit();
	}
}

function process_match_url() {
	if (match_url) {
		load_current_match(match_url)	
		load_match_url(match_url, process_match_url);
	}
	else {
		phantom.exit();
	}
}

function set_format(format_id) {
	open_portal(format_id);
}

function main() {
	if (!read_env()) {
		phantom.exit();
	}

	if (!read_config_values()) {
		phantom.exit();
	}
	if (args.length === 0) {
		console.log("No arguments.");
		console.log("Using: phantomjs odds.js --match-url=<match_url> --season-url=<season_url>");
		phantom.exit();
	}

	cmd_args = parse_arguments(args);
	if ("season-url" in cmd_args) {
		season_url = cmd_args["season-url"];
		process_season_url();
	}
	else if ("match-url" in cmd_args) {
		match_url = cmd_args["match-url"];
		process_match_url();
	}
	else if ("set-format" in cmd_args) {
		set_format(cmd_args["set-format"]);
	}
}

main();
