#!/usr/bin/env bash

mkdir -p ./dist
cat emerge.js | egrep -v '//:dev' > ./dist/emerge.js
./node_modules/.bin/uglifyjs --comments '/^!/' emerge.js > ./dist/emerge.min.js