const PORT = 3001;

var app = require('./app.js'),
    APIeasy = require('api-easy'),
    assert = require('assert'),
    browserid = require('./browserid.js'),
    express = require('express'),
    path = require('path');

app.listen(PORT);

browserid.verify = function(url, assertion, audience, cb) {
  if (assertion != "assertion for example@example.com")
    setTimeout(function() { cb("fail"); }, 10);
  else
    setTimeout(function() { cb(null, {email: "example@example.com"}); }, 10);
};

var suite = APIeasy.describe("server");

suite.expectRedirectTo = function(path) {
  return this.expect(302)
    .expect('redirects to ' + path, function(err, res) {
      assert.equal(res.headers['location'], path);
    });
};

suite._requestFormData = function(method, data) {
  data = data || {};
  if (!('_csrf' in data))
    data._csrf = module.exports.FAKE_UID;
  this.setHeader('Content-Type', 'application/x-www-form-urlencoded')
    [method](data);
  return this;
};

suite.postFormData = function(data) {
  return this._requestFormData('post', data);
};

app.wwwDir = path.join(__dirname, 'www-test');
app.wwwMiddleware = express.static(app.wwwDir);

suite
  .use('localhost', PORT).followRedirect(false)
  .discuss('when logged out')
    .path('/')
      .get()
      .expectRedirectTo("/login/?redirect=%2F")
      .unpath()
    .path('/login/authenticate')
      .post()
      .expect(400, {message: 'assertion expected'})
      .postFormData({assertion: "lol"})
      .expect(400, {message: 'verifier returned error'})
      .next()
      .postFormData({assertion: "assertion for example@example.com"})
      .expect(200, {email: "example@example.com"})
      .next()
    .unpath().undiscuss()
  .discuss('when logged in as example@example.com')
    .path('/example-only')
      .get()
      .expect(301)
      .unpath()
    .path('/example-only/foo.html')
      .get()
      .expect(200)
      .expect("body is 'this is foo'", function(err, req) {
        assert.equal(req.body, "this is foo");
      })
      .unpath()
    .path('/example-only/subdir/another-foo.html')
      .get()
      .expect(200)
      .expect("body is 'this is another foo'", function(err, req) {
        assert.equal(req.body, "this is another foo");
      })
      .unpath()
    .path('/example-only/../example-only/foo.html')
      .get()
      .expect(200)
      .unpath()
    .path('/nonexistent')
      .get()
      .expect(403)
      .expect("body is forbidden", function(err, req) {
        assert.equal(req.body, 'Permission denied! Try <a href="/login/">logging in</a>.');
      })
      .unpath()
    .path('/../test.js')
      .get()
      .expect(403)
      .unpath()
    .path('/example-only/nonexistent.html')
      .get()
      .expect(404)
      .unpath()
    .path('/nonexistent-directory/bar.html')
      .get()
      .expect(403)
      .unpath()
    .path('/another-example-only')
      .get()
      .expect(403)
      .unpath()
    .path('/another-example-only/bar.html')
      .get()
      .expect(403)
    .path('/another-example-only/nonexistent')
      .get()
      .expect(403);

suite.export(module);
