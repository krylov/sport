import os 

ODDS_FOLDER = 'odds'
TEMP_FOLDER = 'temp'
CONFIG_FOLDER = 'conf'
LOG_FOLDER = 'log'
QUERIES_FOLDER = 'queries'
ODDS_CONFIG = 'odds.cfg'
ODDS_JSON_CONFIG = 'odds.cfg.json'
ERROR_LOG = 'error.log'
MAX_ERRORS_LOAD_URL = 3
MAX_ATTEMPTS_GET_ODDS = 3
IGNORED_URLS = 'ignored_urls.lst'
DEFAULT_PLAYER = 'player'
DEFAULT_STRATEGY = 'strategy'


def queries_path():
	return SPORT_PATH + QUERIES_FOLDER

def log_path():
	return SPORT_PATH + LOG_FOLDER + '\\'

def odds_path():
	return ODDS_PATH
	
def temp_path():
	return SPORT_PATH + TEMP_FOLDER + '\\'	
	
def config_path(t = 'ini'):
	if t == 'ini':
		return SPORT_PATH + ODDS_CONFIG
	elif t == 'json':
		return SPORT_PATH + ODDS_JSON_CONFIG
		
def player_config_path(name):
	return '%s/%s.cfg' % (SPORT_PATH + CONFIG_FOLDER, name)
		
def error_log_path():
	return SPORT_PATH + ERROR_LOG
	
def ignored_urls_path():
	return SPORT_PATH + IGNORED_URLS	

if 'SPORT_PATH' in os.environ:
	SPORT_PATH = os.environ['SPORT_PATH']
else:
	print 'It is need SPORT_PATH var in system environment.'

if 'ODDS_PATH' in os.environ:
	ODDS_PATH = os.environ['ODDS_PATH']
else:
	print 'It is need ODDS_PATH var in system environment.'		
