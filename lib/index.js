'use strict';

var Hoek = require('hoek');

// Declare internals
var internals = {};

internals.defaults = {
  sessionId: 'sid',
  segment: 'flash',
  expires: 5 * 60 * 1000 ,  // 5 minutes
  cache: {}
};

exports.register = function (server, options, next) {

  var settings = Hoek.applyToDefaults(internals.defaults, options);
  settings.cache =  server.cache({
    segment: settings.segment,
    expiresIn: settings.expires
  });

  var flash = function (message, destination) {
    let reply = this;
    let request = reply.request;
    let store = request.plugins['hapi-flash'];

    if(message) { //We're writing - so add the message to the stack
      if(store && store.messages) {
        if (Array.isArray(message)) {
          // 'apply' takes an array of arguments as its second parameter, and so in this case
          // the array, is an array, and so all of its values will get pushed onto 'store.messages'
          // (onto the existing array, and not a new array as in 'concat').
          store.messages.push.apply(store.messages, message);
        } else {
          store.messages.push(message);
        }

        if(destination) {
          reply.redirect(destination);
        }
      }
    } else { //We're reading -  so return and then clear all messages
      if(store && store.messages) {
        let messages = Hoek.clone(store.messages);
        store.messages = [];
        return messages;
      } else {
        return [];
      }
    }
  };

  server.decorate('reply', 'flash', flash);

  server.ext('onPostAuth', function (request, reply) {
    if(request.auth.isAuthenticated &&
        request.auth.credentials &&
        request.auth.credentials[settings.sessionId]
    ) {
      let id = request.auth.credentials[settings.sessionId] + '-flash';
      settings.cache.get(id, function (err, messages) {
        if (err) {
          reply(err);
        } else {
          if(messages && Array.isArray(messages)) {
            request.plugins['hapi-flash'] = {messages: messages};
            settings.cache.drop(id, function (err) {});
            reply.continue();
          } else {
            request.plugins['hapi-flash'] = { messages: []};
            reply.continue();
          }
        }
      });
    } else {
      reply.continue();
    }
  });

  // Store any messages in the cache
  server.ext('onPreResponse', function (request, reply) {
    if (request.auth.isAuthenticated &&
        request.auth.credentials &&
        request.plugins['hapi-flash'] &&
        request.plugins['hapi-flash'].messages &&
        request.plugins['hapi-flash'].messages.length > 0
    ) {
      let id = request.auth.credentials[settings.sessionId] + '-flash';
      settings.cache.set(id, request.plugins['hapi-flash'].messages, settings.expires, function (err) {
        if (err) {
          return reply(err);
        }
        return reply.continue();
      });
    } else {
      return reply.continue();
    }
  });

  return next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};