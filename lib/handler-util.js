'use strict';

/**
 * ステータスコード401-Unauthorized を返し、その後「ログアウトしました」という
 * テキストをレスポンスに書き込む関数。
 */
function handleLogout(req, res) {
  res.writeHead(401, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('ログアウトしました');
}

module.exports = {
  handleLogout
};
