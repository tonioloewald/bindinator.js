# Exemplar

(The word "exemplar" means *a person or thing serving as a typical example or excellent model*.)

Isn't **type safety** awesome? No? OK let's pretend you said yes.

*Exemplar* is a way of managing types as gradually and painlessly as you would like. It works like this:

  const {exemplar} = require('lib/exemplar.js');
  const my_type = exemplar({foo: 17, bar: 'hello'});
  my_type({foo: -1, bar: ''}); // returns true

That seems pretty easy. Suppose you wanted a non-negative foo:

  const {exemplar} = require('lib/exemplar.js');
  const cardinal_type = exemplar(17).whole().and(x => x >= 0);
  const non_empty_string_type = exemplar('hello').nonempty();
  const my_type = exemplar({
    foo: cardinal_type, 
    bar: non_empty_string_type
  });

Now let's suppose you have a function takes a set of parameters but also takes an options object (a common case when a library function's parameters got out of control), e.g.

  ajax(url, body, method, success, failure, headers) // or
  ajax(url, options_object)
  
So its parameter type is something like

  [string, body?, 'GET'|'POST'|..., function?, function?, array[string]?]
  [string, object_with_a_bunch_of_optional_properties?]

(Where ? connotes an optional parameter.)

Copyright ©2016-2017 Tonio Loewald