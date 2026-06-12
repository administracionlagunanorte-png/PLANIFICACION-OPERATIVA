#!/bin/bash
cd /home/z/my-project
export DATABASE_URL='postgresql://neondb_owner:npg_KWPvQ1YZmFG8@ep-small-pine-ajbbinww-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'
NODE_OPTIONS='--max-old-space-size=1024' exec /home/z/my-project/node_modules/.bin/next start -H 0.0.0.0 -p 3000
