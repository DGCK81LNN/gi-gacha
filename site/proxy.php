<?php
function jsone($value) {
  return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function complain($message, $code) {
  header('Content-Type: application/json; charset=utf-8');
  die(jsone([
    'message' => $message,
    'data' => NULL,
    'retcode' => $code,
  ]));
}

if (strtoupper($_SERVER['REQUEST_METHOD']) !== 'GET') {
  http_response_code(405);
  die();
}

$url = $_SERVER['QUERY_STRING'];
$base_url = strchr($url, '?', true) ?: $url;
$allow_base_urls = [
  'https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog',
  'https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog',
];
if (!in_array($base_url, $allow_base_urls)) {
  complain('网址有误，服务器拒绝代理此请求', -11451400);
}

$headers = [];
$passthru_keys = [
  'cache-control',
  'expires',
  'content-length',
  'content-type',
  'content-encoding',
  'content-language',
];
$request = curl_init($url);
curl_setopt_array($request, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADERFUNCTION => function ($_, $header) {
    global $headers, $passthru_keys;
    if (!$header) return 0;
    $key = strchr($header, ':', true);
    if ($key === false && !count($headers) ||
      in_array(strtolower($key), $passthru_keys)) {
      $headers[] = $header;
    }
    return strlen($header);
  },
  CURLOPT_TIMEOUT => 5,
  CURLOPT_USERAGENT => 'GIGachaVisualizer/0.3',
]);
$response = curl_exec($request);
curl_close($request);

if ($response === false) {
  $err = curl_error($request);
  complain("代理请求时出现错误：$err", -11451400 - curl_errno($request));
}

foreach ($headers as $header) {
  header($header);
}
echo $response;
