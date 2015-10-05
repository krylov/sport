import odds_options
import odds_tools
import sys
import os.path
import re
import argparse
import subprocess
import json
import ConfigParser
import shutil
from datetime import datetime

AttemptGetOdds = 0
ErrorLoadURL = 0
PreviousURL = 'dd'

def short_code():
	config = ConfigParser.ConfigParser()
	config.read(odds_options.config_path())
	sections = config.sections()
	
	sc = {}
	for s in sections:
		options = config.options(s)
		if ('short' in options) and ('code' in options):
			sc[config.get(s, 'short')] = config.get(s, 'code')
		else:
			return {}
	return sc
	
def part_code():
	config = ConfigParser.ConfigParser()
	config.read(odds_options.config_path())
	return config.defaults()
	
def season_page_url(path, url):
	season = odds_tools.read_json_file(path)
	if not (season and season['pages']):
		return url
	ix = 1	
	for loaded in season['pages']:
		if not loaded:
			return season['source'] + '#/page/' + str(ix) + '/'
		ix += 1
	return ''
	
def modify_if_current_season(path):	
	file_part = os.path.basename(path)
	file_name = os.path.splitext(file_part)[0]
	m = re.findall('\-\d{4}', file_name)
	if m: # if m isn't empty season isn't current
		return
	season = odds_tools.read_json_file(path)
	if not season:
		return
	season['pages'] = []
	fw = open(path, 'w')
	fw.write(json.dumps(season, False, False))	
		
def match_page_url(path, url):
	season = odds_tools.read_json_file(path)
	if not season:
		return ''
	for match_url in season['match_sources']:
		if not season['match_sources'][match_url]:
			return match_url
	return ''	
	
def mark_match(path, url):
	season = odds_tools.read_json_file(path)
	if not season:
		return false
	if url in season['match_sources']:
		season['match_sources'][url] = True
		fw = open(path, 'w')
		fw.write(json.dumps(season, False, False))
		n_loaded = 0
		for url in season['match_sources']:
			if season['match_sources'][url]:
				n_loaded += 1
		print 'Uploaded ' + str(n_loaded) + ' of ' + str(len(season['match_sources'])) + '.' 
		return True
	return False
	
def is_url_ignored(url):	
	ignored_path = odds_options.ignored_urls_path()
	if not os.path.isfile(ignored_path):
		return False
	ignored_file = open(ignored_path)
	content = ignored_file.readlines()
	content = [line.replace('\n', '') for line in content]
	url_is_ignored = url in content
	ignored_file.close()
	return url_is_ignored	
	
def ignore_url(current_url):
	global PreviousURL
	global AttemptGetOdds
	global ErrorLoadURL
	if current_url == PreviousURL:
		log_path = odds_options.error_log_path()
		if not os.path.isfile(log_path):
			AttemptGetOdds += 1
		else:
			log_file = open(log_path)
			content = log_file.readlines()[-2-ErrorLoadURL:-1]
			log_file.close()
			last_lines_contain_url = [line for line in content if current_url in line]
			if len(last_lines_contain_url) == ErrorLoadURL + 1:
				ErrorLoadURL += 1
			else:
				AttemptGetOdds += 1
		if ErrorLoadURL == odds_options.MAX_ERRORS_LOAD_URL:
			print 'The maximum number of faulty downloads reached.'
			exit()
		if AttemptGetOdds == odds_options.MAX_ATTEMPTS_GET_ODDS:
			if not is_url_ignored(current_url):
				ignored_file = open(odds_options.ignored_urls_path(), 'a')
				ignored_file.write(current_url + '\n')
				ignored_file.close()
			ErrorLoadURL = 0
			AttemptGetOdds = 0
			return True
	else:
		ErrorLoadURL = 0
		AttemptGetOdds = 0
		PreviousURL = current_url
	return False
	
def match_odds_url(path, url):	
	match = odds_tools.read_json_file(path)
	if not match:
		return url
	while 1:	
		keys = match['odds'].keys()
		pc = part_code()
		for k in keys:
			if match['odds'][k]:
				parts = match['odds'][k].keys()
				for p in parts:
					current_url = url + '#' + k + ';' + pc[p.lower()]
					if not (match['odds'][k][p] or is_url_ignored(current_url)):
						if ignore_url(current_url):
							continue
						return current_url
			else:
				return url + '#' + k
		return ''
	
def config_to_json():
	config = ConfigParser.ConfigParser()
	if not config.read(odds_options.config_path()):
		return False
	sections = config.sections()
	bet_types = {}
	for s in sections:
		options = config.options(s)
		odd_names = {}
		for opt in options:
			odd_names[opt] = config.get(s, opt)
		bet_types[s] = odd_names
	fw = open(odds_options.config_path('json'), 'w')
	fw.write(json.dumps(bet_types, False, False))
	return True
	
def set_odds_format():
	subprocess.call('phantomjs --cookies-file=odds.cookies odds.js --set-format=1')
	
def load_match_odds(url):
	full_command = 'phantomjs --cookies-file=odds.cookies odds.js --match-url=' + url
	print 'Full command: %s' % full_command	
	subprocess.call(full_command)
	print 'Completed.'
	
def load_match_urls(url):
	full_command = 'phantomjs --cookies-file=odds.cookies odds.js --season-url=' + url
	print 'Full command: %s' % full_command
	subprocess.call(full_command)
	print 'Completed.'
	
def load_all_odds(match_url):
	#print 'match_url: %s' % match_url
	json_path = odds_tools.path_from_match_url(match_url)
	while 1:
		print '------------------------------------------'
		print 'Current Time: ' + str(datetime.now())
		url = match_odds_url(json_path, match_url)
		if not url:
			break
		load_match_odds(url)
		print '------------------------------------------'			

def load_all_match_urls(season_url):
	json_path = odds_tools.path_from_season_url(season_url)
	modify_if_current_season(json_path)
	while 1:
		print '------------------------------------------'
		print 'Current Time: ' + str(datetime.now())
		url = season_page_url(json_path, season_url)
		if not url:
			break
		load_match_urls(url)		
		print '------------------------------------------'
	while 1:
		match_url = match_page_url(json_path, season_url)
		if not match_url:
			break
		load_all_odds(match_url)
		mark_match(json_path, match_url)
		
def correct_season_name(season_url, years):
	print 'SEASON URL: %s' % (season_url,)
	print 'YEARS: %s' % (years,)
	json_path = odds_tools.path_from_season_url(season_url)
	new_json_path = json_path.replace('.json', '-%s.json' % (years,))
	shutil.copyfile(json_path, new_json_path)
	print 'JSON PATH: %s' % (json_path,)
	print 'NEW JSON PATH: %s' % (new_json_path,)
	season = odds_tools.read_json_file(new_json_path)
	tour = odds_tools.tour_from_season_url(season['source'])
	print 'TOUR: %s' % (tour,)
	new_tour = '%s-%s' % (tour, years,)
	season['source'] = season['source'].replace(tour, new_tour)
	print 'NEW SOURCE: %s' % (season['source'])
	match_sources = season['match_sources']
	new_match_sources = {}
	for src in match_sources:
		new_src = src.replace(tour, new_tour)
		new_match_sources[new_src] = match_sources[src]
	season['match_sources'] = new_match_sources	
	fw = open(new_json_path, 'w')
	fw.write(json.dumps(season, False, False))	
	fw.close()
	country_folder = os.path.dirname(new_json_path)
	tour_folder = '%s/%s' % (country_folder, tour,)	
	new_tour_folder = '%s/%s' % (country_folder, new_tour,)
	print 'NEW TOUR FOLDER: %s' % (new_tour_folder,)
	if not os.path.isdir(new_tour_folder):
		os.mkdir(new_tour_folder)
		shutil.copyfile(json_path, new_json_path)
	json_files = [ f for f in os.listdir(tour_folder) ]
	for f in json_files:
		new_match_path = '%s/%s' % (new_tour_folder, f,)
		if not os.path.isfile(new_match_path):
			match_path = '%s/%s' % (tour_folder, f)
			if not os.path.isdir(match_path):
				print 'MATCH_PATH: %s' % match_path
				shutil.copyfile(match_path, new_match_path)
				match = odds_tools.read_json_file(new_match_path)
				match['source'] = match['source'].replace(tour, new_tour)
				fw = open(new_match_path, 'w')
				fw.write(json.dumps(match, False, False))	
				fw.close()
		
def rename_old_error_log():		
	log_path = odds_options.error_log_path()
	if os.path.isfile(log_path):
		n = 1
		while os.path.isfile(log_path + "." + str(n) + ".old"):
			n += 1
		os.rename(log_path, log_path + "." + str(n) + ".old")
	
	
def main():
	rename_old_error_log()
	config_to_json()
	parser = argparse.ArgumentParser(description = 'Run phantomjs-script.')
	parser.add_argument('-m', '--match-url', help = 'Match URL.')
	parser.add_argument('-s', '--season-url', help = 'Season URL.')
	parser.add_argument('-a', '--add-season-years', help = 'Correct season name.')	
	args = parser.parse_args()
	if args.match_url:
		set_odds_format()	
		load_all_odds(args.match_url)
	if args.season_url:
		if args.add_season_years:
			correct_season_name(args.season_url, args.add_season_years)
		else:
			set_odds_format()
			load_all_match_urls(args.season_url)
			
main()
