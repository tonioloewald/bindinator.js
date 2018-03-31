#!/bin/sh

function error() {
  osascript <<EOT
    tell app "System Events"
      display dialog "$1" buttons {"OK"} default button 1 with icon caution with title "$(basename $0)"
      return  -- Suppress result
    end tell
EOT
}

# safely switch to the directory the script is in
here="`dirname \"$0\"`"
echo "cd-ing to $here"
cd "$here" || exit 1

if [ ! -x /Applications/nwjs.app/ ]
then
  error "expected to find nwjs.app in /Applications"
  exit 1
fi

cp nwjs/package.json package.json
/Applications/nwjs.app/Contents/MacOS/nwjs .
cp electron/package.json package.json
