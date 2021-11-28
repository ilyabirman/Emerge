#!/usr/bin/env bash

mkdir -p ./dist
cat emerge.js | egrep -v '//:dev' > ./dist/emerge.js
