# b8r — require.js

I didn't set out to write my own commonjs implementation, but when I tried to pick one off the shelf it just seemed like too much work to decide and "how hard can it be?" It's not like a production website delivers requirejs to the end user anyway, right?

  <script="lib/require.js"></script>
  <script>
    /* global require */
    'use strict';
    
    const Foo = require('foo.js');
    const foo = new Foo();
  </script>

A typical library would look like this:

  /* global module */
  (function(module){
    'use strict';
    function Foo(){}; // creates useless objects
    module.exports = Foo;
  });

Note that I do not provide an API to require with a list of paths to search or allow you to omit .js. Know where your shit is!

So **require** does commonjs require except I've probably screwed up something with respect to relative paths in required modules. (Originally, I only did paths relative to the app path, but that sucked.)

require is implemented using synchronous ajax because I don't care (you're going to compile and minify all this shit, right? Or use a service worker), so expect some warnings.

Finally, require is smart enough to only load and evaluate stuff once. I'm not a monster!

So now if you require('lib/foo.js') and foo.js needs bar.js inside lib, you can either require('lib/bar.js') or require('./bar.s'). That seems dumb to me but I read something about why that was right and my eyes glazed over.

   var foo = null;
   require.lazy('https://cdn.whatever.com/libs/6.6.6/foo.js')
        .then(Foo => foo = new Foo());

Also **require.lazy** is there mainly for pulling in stuff from outside sources. (I should probably rename it require.async or require.promise, I guess.)

Internally, require implements define in just the way you'd want if you were going to compile a bunch of javascript files into a single file for efficiency, so one day I might have another bout of Not Invented Here and do that.

Copyright ©2016-2017 Tonio Loewald