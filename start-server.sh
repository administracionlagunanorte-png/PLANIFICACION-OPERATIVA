#!/bin/bash
cd /home/z/my-project
NODE_OPTIONS='--max-old-space-size=1024' exec /home/z/my-project/node_modules/.bin/next start -H 0.0.0.0 -p 3000
