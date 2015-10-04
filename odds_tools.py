import odds_options
import os.path
import json
import re

def path_from_season_url(url):
	m = re.findall('[\w\d\-\.]+', url)
	if not m:
		return ''
	if m[0] == 'http':
		del m[0]
	if m[0] == 'www.oddsportal.com' or m[0] == 'oddsportal.com':
		del m[0]
	pos = m.index('results')
	if pos > -1:
		del m[pos:]
	return odds_options.odds_path() + '/'.join(m) + '.json'
	
def tour_from_season_url(url):
	m = re.findall('[\w\d\-\.]+', url)
	if not m:
		return ''
	if m[0] == 'http':
		del m[0]
	if m[0] == 'www.oddsportal.com' or m[0] == 'oddsportal.com':
		del m[0]	
	season_name = m[2]
	return re.sub('\-\d{4}', '', season_name)
	
def path_from_match_url(url):
	m = re.findall('[\w\d\-\#\;\.]+', url)
	if not m:
		return ''
	if m[0] == 'http':
		del m[0]
	if m[0] == 'www.oddsportal.com' or m[0] == 'oddsportal.com':
		del m[0]	
	if '#' in m[-1]:
		del m[-1]
	return odds_options.odds_path() + '/'.join(m) + '.json'
		
def read_json_file(path):
	if not os.path.isfile(path):
		print path + ' does not exist.'
		return ''
	json_file = open(path)
	content = json_file.read()
	return json.loads(content)		

def print_dict(d, indent=0):
	if type(d) is dict:
		keys = d.keys()
		for k in keys:
			if type(d[k]) is dict:
				print ' ' * indent + '\'' + k + '\' :'
				print_dict(d[k], indent + 2)
			else:
				if type(d[k]) is list:
					value_str = ', '.join(d[k])
				else:
					value_str = str(d[k])
				print ' ' * indent + '\'' + k + '\' : \'' + value_str + '\''
	else:
		print 'd is not dict'
		