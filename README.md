# hapi-flash

Reply interface decorated flash messages - for the [post,put,path,delete] redirect to [get] pattern.
Currently supports any session-based hapi authentication scheme that populates request.auth.credentials (such as 
[hapi-auth-cookie](https://github.com/hapijs/hapi-auth-cookie)).

## Usage

### Set Flash Message
Anywhere that you would would ordinarily issue a `reply.redirect(url)`, use `reply.flash(message, url)`.

`reply.flash(message)` can also be called multiple times adding multiple flash messages if the redirect url argument is omitted, followed by either `reply.flash(message, url)`, or the standard `reply.redirect(url)`.  
 
### Retrieve Flash Messages
From any handler, or anywhere in the request pipeline where the `reply` interface is available, call `reply.flash()` with no arguments, and all flash messages will be returned as well as cleared from the flash cache.
 Flash messages are returned as an array.
 
## Installation

`npm install hapi-flash --save`

## Registering the Plugin


    server.register(require('hapi-flash'), function(err) {
      if (err) {
        console.log('Failed loading plugin');
      }
    });
    
or
   
    server.register({
        register: require('hapi-flash'),
        options: {
            sessionId: 'sid',
            segment: 'flash',
            expires: 5 * 60 * 1000 ,  // 5 minutes
        }
     }, function (err) {
         if (err) {
             console.log('Failed loading plugin');
         }
     });

