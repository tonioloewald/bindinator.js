<?php

/**
# Implements PHP services for bindinator.com examples
*/

ini_set('display_startup_errors', 1);
ini_set('display_errors', 1);
error_reporting(-1);

$route = $_SERVER['REDIRECT_QUERY_STRING'];

function cachedFile($url, $max_age_seconds = 3600) {
  if( ! file_exists ( 'cache' ) ) {
    mkdir( 'cache');
  }
  $url_parts = explode('/', $url);
  $url_parts = array_slice($url_parts, 2)
  $cache_file = 'cache/' . implode('-', $url_parts);
  $timestamp = file_exists($cache_file) ? filemtime($cache_file) : 0;
  if (file_exists($cache_file) && ($timestamp > (time() - $max_age_seconds ))) {
    header('Data-Cached-At: ' . date('c', $timestamp));
    $file = file_get_contents($cache_file);
  } else {
    $file = file_get_contents($url);
    file_put_contents($cache_file, $file, LOCK_EX);
  }
  return $file;
}

$route_parts = explode('=', $route, 2);
$key = $route_parts[0];
header('Access-Control-Allow-Origin: *');
switch($key) {
  case 'modis':
    $output = cachedFile("https://firms.modaps.eosdis.nasa.gov/active_fire/c6/text/MODIS_C6_USA_contiguous_and_Hawaii_24h.csv");
    print($output);
    break;
  case 'rss':
    header('Access-Control-Allow-Origin: *');
    $output = cachedFile($route_parts[1]);
    print($output);
    break;
  default:
    print($route);
    // phpinfo(); 
}

?>