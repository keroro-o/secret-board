'use strict';

const crypto = require('crypto');
const pug = require('pug');
const Cookies = require('cookies');
const moment = require('moment-timezone');
const util = require('./handler-util');
const Post = require('./post');

const trackingIdKey = 'tracking_id';

function handle(req, res) {
  const cookies = new Cookies(req, res);
  const trackingId = addTrackingCookie(cookies, req.user);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll({ order: [['id', 'DESC']] }).then((posts) => {
        posts.forEach((post) => {
          post.content = post.content.replace(/\+/g, ' ');
          post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
        });
        res.end(pug.renderFile('./views/posts.pug', {
          posts: posts,
          user: req.user
        }));
        console.info(
          `閲覧されました: user: ${req.user}, ` +
          `トラッキングId: ${trackingId}, ` +
          `IPアドレス: ${req.connection.remoteAddress}, ` +
          `ユーザーエージェント: ${req.headers['user-agent']} `
        );
      });
      break;
    case 'POST':
      let body = '';
      req.on('data', (chunk) => {
        body = body + chunk
      }).on('end', () => {
        const decoded = decodeURIComponent(body);
        const content = decoded.split('=')[1];
        console.info(`投稿されました： ${content}`);
        Post.create({
          content: content,
          trackingCookie: trackingId,
          postedBy: req.user
        }).then(() => {
          handleRedirectPosts(req, res);
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      let body = '';
      req.on('data', (chunk) => {
        body = body + chunk;
      }).on('end', () => {
        const decoded = decodeURIComponent(body);
        const id = decoded.split('=')[1];
        Post.findById(id).then((post) => {
          if (req.user === post.postedBy || req.user === 'admin') {
            post.destroy().then(() => {
              console.info(
                `削除されました: user: ${req.user}, ` +
                `IPアドレス: ${req.connection.remoteAddress}, ` +
                `ユーザーエージェント: ${req.headers['user-agent']} `
              );
              handleRedirectPosts(req, res);
            });
          }
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

/**
 * Cookie に含まれているトラッキングIDに異常がなければ、その値を返し、
 * 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す。
 * @param {Cookies} cookies 
 * @param {String} userName 
 * @return {String} トラッキングID
 */
function addTrackingCookie(cookies, userName) {
  const requestedTrackingId = cookies.get(trackingIdKey);
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
  } else {
    const originalId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    const trackingId = originalId + '_' + createValidHash(originalId, userName);
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}

/**
 * トラッキングID とユーザー名から、そのトラッキングID が正しいかどうかを検証する関数。
 * @param {String} trackingId 
 * @param {String} userName 
 * @return {Boolean} true or false
 */
function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  const splitted = trackingId.split('_');
  const originalId = splitted[0];
  const requestedHash = splitted[1];
  return createValidHash(originalId, userName) === requestedHash;
}

const secretKey =
  `a156dfd34b336cd3dc399344773a2e997f9f93059ac85ee5164
  3ea48605ce23a1cc3dba96ae04ae924553c3f1e7b6911ffc1253
  ed1629949214a7d67f5279c1a564754047f7cca98c6bcaea6637
  b67d582349b7d9f8392e04f083b7d8ffd7c3775356e67b549257
  598737c59148fbd7f8727d00c4c86801f95a65d306969770459b
  060b9d5b420c839bbffa20e9f13017a24f6f308192acb20bdf11
  67382580b1e9667d732b3b0ad8905940fb0e5bed9ecd40fdd9f5
  7f8b7a78463514d168ec0381fc7d51327fc95e62a0e801e33bf4
  2a307bda788893ea6b04ae26273efd2d6523a26d87580408c3de
  e3b2f4d6a75264fb83065e6f9b86f31ff1b555337c661`;

/**
 * SHA-1アルゴリズムを利用して、元々のトラッキングID とユーザー名を結合した文字列に対して、
 * メッセージダイジェストを作成し返す関数。
 * @param {String} originalId 
 * @param {String} userName 
 * @return {String} 16進数の文字列で表したメッセージダイジェスト
 */
function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(originalId + userName + secretKey);
  return sha1sum.digest('hex');
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
  handle,
  handleDelete
};