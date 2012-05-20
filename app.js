var express = require('express'),
    path = require('path'),
    browserid = require('./browserid.js'),
    fs = require('fs'),
    config = require('./config.js'),
    url = require('url');

function resolve(absPath) {
  return url.resolve(config.baseURL || '/', absPath.slice(1));
}

const FORBIDDEN_HTML = 'Permission denied! Try <a href="' +
                       resolve('/login/') + '">logging in</a>.';

var app = config.https ? express.createServer(config.https) :
                         express.createServer();

app.use(express.static(path.join(__dirname, 'static')));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: config.cookieSecret}));

app.post('/login/authenticate', function(req, res) {
  if (!req.body || !req.body['assertion'])
    return res.send({message: 'assertion expected'}, 400);
  var uri = config.browserid;
  var audience = config.hostname;
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
  var p = resolve(path.normalize(req.path));
  if (!req.session.email)
    return res.redirect('/login/?redirect=' + encodeURIComponent(p));
  return next();
});

app.use(function(req, res, next) {
  var p = path.normalize(req.path);
  var filename = path.join(config.wwwDir, p);
  
  function checkAccess(dirname) {
    if (dirname.indexOf(config.wwwDir) != 0)
      return res.send(FORBIDDEN_HTML, 403);
    var browseridaccess = path.join(dirname, '.browseridaccess');
    fs.readFile(browseridaccess, 'utf-8', function(err, emails) {
      if (err) {
        if (err.code == 'ENOENT' || err.code == 'ENOTDIR')
          return checkAccess(path.dirname(dirname));
        throw err;
      }
      emails = emails.split('\n');
      if (emails.indexOf(req.session.email) == -1)
        return res.send(FORBIDDEN_HTML, 403);
      return next();
    });
  }
  
  checkAccess(filename);
});
app.use(express.static(config.wwwDir));

module.exports = app;

if (!module.parent) {
  console.log("listening on", config.hostname + ":" + config.port);
  app.listen(config.port);
}
