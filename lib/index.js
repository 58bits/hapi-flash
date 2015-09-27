'use strict';

var Hoek = require('hoek');
var Boom = require('boom');

// Declare internals
var internals = {};

internals.defaults = {
  sessionId: 'sid',
  segment: 'flash',
  expires: 5 * 60 * 1000 ,  // 5 minutes
  cache: {}
};

exports.register = function (server, options, next) {
  console.log('register called');

  var settings = Hoek.applyToDefaults(internals.defaults, options);
  settings.cache =  server.cache({
    segment: settings.segment,
    expiresIn: settings.expires
  });

  var flash = {
    _messages: [],
    load: function(request, reply) {
      if(request.auth.isAuthenticated && request.auth.credentials && request.auth.credentials[settings.sessionId]) {
        let id = request.auth.credentials[settings.sessionId] + '-flash';
        settings.cache.get(id, function (err, messages) {
          if (err) {
            reply(err);
          } else {
            flash._messages = Array.isArray(messages) ? messages : [];
            settings.cache.drop(id, function (err) {});
            reply.continue();
          }
        });
      } else {
        reply.continue();
      }
    },
    get: function() {
      return flash._messages;
    },
    set: function (message) {
      flash._messages.push(message);
    },
    store: function(request, reply) {
      if (request.auth.credentials && flash._messages && flash._messages.length > 0) {
        let id = request.auth.credentials[settings.sessionId] + '-flash';
        settings.cache.set(id, request.auth.session.messages, settings.expires, function (err) {
          if (err) {
            return reply(err);
          }
          return reply.continue();
        });
      } else {
        return reply.continue();
      }
    }

  };

  server.decorate('request', 'flash', flash);

  server.ext('onPostAuth', function (request, reply) {
    console.log('onPostAuth called');
    request.flash.load(request,reply);
  });

  server.ext('onPreResponse', function (request, reply) {
    console.log('onPreResponse called');
    request.flash.store(request,reply);
  });

  return next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};