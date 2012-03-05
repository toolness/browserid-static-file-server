This is a very simple static file server that limits access on a per-directory basis to users with certain email addresses, verifiable by BrowserID.

Any directory can contain a `.browseridaccess` file which is simply a list of email addresses, delimited by newlines. Only the email addresses listed in this file can access the directory and its subdirectories (unless those subdirectories themselves contain `.browseridaccess` files).

## Quick Start

At the terminal, run:

    $ git clone git://github.com/toolness/browserid-static-file-server.git
    $ cd browserid-static-file-server
    $ cp config.js.sample config.js
    $ npm install
    
This should get you set up for development. To run the tests, try:

    $ npm test

Now you can run the development server with:

    $ node_modules/.bin/up -w -n 1 app.js

Unless you change `config.js`, static files will be served from the `www` directory relative to the project root. You'll want to create that and probably put a `.browseridaccess` file in its root directory.

When deploying for production use, you'll probably want to change `config.js` and then use simply:

    $ node app.js

