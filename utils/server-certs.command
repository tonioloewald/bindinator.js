#!/bin/sh

#!/bin/sh

# method for showing error alert via AppleScript
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

if [ ! -d localhost-ssl ]
then
  error "creating directory localhost-ssl"
  mkdir localhost-ssl
fi

if [ -f localhost-ssl/private.pem ]
then
  error "private.pem already exists; delete first if you want to regenerate keys"
  exit 1
fi

cd localhost-ssl

echo "creating localhost-ssl/private.pem"
openssl req -newkey rsa:2048 -new -nodes -keyout private.pem -out csr.pem

echo "extracting localhost-ssl/public.pem"
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout private.pem -out public.pem

cd ..