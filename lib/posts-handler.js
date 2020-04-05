'use strict';

const pug = require('pug');
const contents = [];

function handle(req, res) {
  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(pug.renderFile('./views/posts.pug'));
      break;
    case 'POST':
      let body = '';
      req.on('data', (chunk) => {
        body = body + chunk
      }).on('end', () => {
        const decoded = decodeURIComponent(body);
        const content = decoded.split('content=')[1];
        console.info(`投稿されました： ${content}`);
        contents.push(content);
        console.info(`投稿された全内容： ${contents}`);
        handleRedirectPosts(req, res);
      });
      break;
    default:
      break;
  }
}

/**
 * /posts へのリダイレクトをハンドリングする関数。
 * ステータスコードとして、303-See Other を利用する。このステータスコードは、POSTでアクセスした際に、
 * その処理の終了後、GETでも同じパスにアクセスし直してほしいときに利用するステータスコード。
 */
function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle
};