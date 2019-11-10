<?php

/**
# Implements PHP services for bindinator.com examples
*/

$route = $_SERVER['REDIRECT_QUERY_STRING'];

function cachedFile($url, $max_age_seconds = 3600) {
  if( ! file_exists ( 'cache' ) ) {
    mkdir( 'cache');
  }
  $cache_file = 'cache/' . end(explode('/', $url));
  $timestamp = filemtime($cache_file);
  if (file_exists($cache_file) && ($timestamp > (time() - $max_age_seconds ))) {
    header('Data-Cached-At: ' . date('c', $timestamp));
    $file = file_get_contents($cache_file);
  } else {
    $file = file_get_contents($url);
    file_put_contents($cache_file, $file, LOCK_EX);
  }
  return $file;
}

switch($route) {
  case 'modis':
    header('Access-Control-Allow-Origin: *');
    print(cachedFile("https://firms.modaps.eosdis.nasa.gov/active_fire/c6/text/MODIS_C6_USA_contiguous_and_Hawaii_24h.csv"));
    break;
  default:
    print($route);
    // phpinfo(); 
}

?>