const FORBIDDEN_HTML = 'Permission denied! Try <a href="/login/">logging in</a>.';
const COOKIE_SECRET = "lolwut";

var express = require('express'),
    path = require('path'),
    browserid = require('./browserid.js'),
    fs = require('fs');

var app = express.createServer();

app.use(express.static(path.join(__dirname, 'static')));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: COOKIE_SECRET}));

app.post('/login/authenticate', function(req, res) {
  if (!req.body || !req.body['assertion'])
    return res.send({message: 'assertion expected'}, 400);
  var uri = 'https://browserid.org:443/verify';
  var audience = 'localhost';
  var assertion = req.body['assertion'];
  browserid.verify(uri, assertion, audience, function(err, verifierResponse) {
    if (err) {
      return res.send({message: 'verifier returned error'}, 400);
    }
    req.session.email = verifierResponse.email;
    return res.send({email: verifierResponse.email});
  });
});

app.use(function(req, res, next) {
  var p = path.normalize(req.path);
  if (!req.session.email) {
    res.setHeader('Location', '/login/?redirect=' + encodeURIComponent(p));
    res.statusCode = 302;
    return res.end();
  }
  return next();
});

app.wwwDir = path.join(__dirname, 'www');
app.wwwMiddleware = express.static(app.wwwDir);
app.use(function(req, res, next) {
  var p = path.normalize(req.path);
  var filename = path.join(app.wwwDir, p);
  var dirname;
  
  fs.stat(filename, function(err, stats) {
    if (err)
      return res.send("Not Found", 404);
    if (stats.isDirectory()) {
      dirname = filename;
    } else {
      dirname = path.dirname(filename);
    }
    var browseridaccess = path.join(dirname, '.browseridaccess');
    fs.readFile(browseridaccess, 'utf-8', function(err, emails) {
      if (err) {
        if (err.code == 'ENOENT')
          return res.send(FORBIDDEN_HTML, 403);
        throw err;
      }
      emails = emails.split('\n');
      if (emails.indexOf(req.session.email) == -1)
        return res.send(FORBIDDEN_HTML, 403);
      return app.wwwMiddleware(req, res, next);
    });
  });
});

module.exports = app;
