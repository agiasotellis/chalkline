#!/bin/sh
# Wraps landing/body.html (the hosted-preview version) into a full index.html.
cd "$(dirname "$0")/.."
{ printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="Chalkline: quotes, jobs and invoices for tradespeople.">\n'
  sed -n '1,/<\/style>/p' landing/body.html; printf '</head>\n<body>\n'
  sed -n '/<\/style>/,$p' landing/body.html | tail -n +2; printf '</body>\n</html>\n'; } > index.html
