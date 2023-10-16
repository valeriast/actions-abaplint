#!/bin/sh
echo $INPUT_VERSION
node /filter_changed_files.js
npm install @abaplint/cli@$INPUT_VERSION -g
abaplint -f total --outformat json --outfile /result.json
cd /
npm install @octokit/rest@16.10.0 --loglevel=error
node /logic.js
