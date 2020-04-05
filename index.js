'use strict';

const http = require('http');
const auth = require('http-auth');
const router = require('./lib/router');

// ファイルの情報を利用して Basic 認証を行う。公式ドキュメント参照。
const basic = auth.basic({
  realm: 'Enter username and password',
  file: './users.htpasswd'
});

const server = http.createServer(basic, (req, res) => {
  router.route(req, res);
}).on('error', (e) => {
  console.error('Server Error', e);
}).on('clientError', (e) => {
  console.error('Client Error', e);
});

const port = 8000;
server.listen(port, () => {
  console.info(`ポート ${port} 番でサーバーを起動しました`);
});