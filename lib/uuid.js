/**
# uuid

A simple method for creading uuids. Usage:

        const uuid = require('uuid.js');
        const some_uuid = uuid();

~~~~
        const uuid = _required_;
        Test(() => uuid().match(/[0-9a-f]+/g).length).shouldBe(5);
        Test(() => uuid().match(/[0-9a-f]+/g).map(s => s.length).join(',')).shouldBe('8,4,4,4,12');
        Test(() => uuid().length).shouldBe(36);
        Test(() => uuid()).shouldNotBe(uuid());
~~~~
*/
/* global module */
'use strict';

(function (module){
module.exports = function (){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
};
}(module));