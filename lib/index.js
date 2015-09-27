'use strict';

var Hoek = require('hoek');
var Boom = require('boom');

// Declare internals
var internals = {};

internals.defaults = {
  sessionId: 'sid',
  expires: 60 * 60 * 1000 ,   // One hour - could be much less,
  cache: {}
};


exports.register = function (server, options, next) {

  var settings = Hoek.applyToDefaults(internals.defaults, options);
  if(!settings.cache || Object.keys(settings.cache).length === 0)
    settings.cache = server.cache({
      expiresIn: settings.expires   // One hour - could be much less
    });

  server.ext('onPostAuth', function (request, reply) {

    if(!request.auth.session || !request.auth.session[settings.sessionId]) {
      return decorate(Boom.badImplementation('session ID not set for request.auth.session'));
    }

    let id = request.auth.session[settings.sessionId] + '-flash';

    var load = function () {
      return settings.cache.get(id, function (err, messages) {
        if (err) {
          return decorate(err);
        } else {
          if (messages) {
            request.auth.session.messages = messages;
            settings.cache.drop(id, function(err){});
            return decorate();
          }
        }
      });
    };

    var decorate = function (err) {

      request.auth.session.flash = function (message) {

        request.auth.session.messages = request.auth.session.messages || [];

        // If we're asking for messages - we take them and dump the message queue.
        // Typically only on a 'get' request.
        if (!message) {
          var messages = request.auth.session.messages;
          request.auth.session.messages = [];
          return messages;
        }

        // If we're setting a message - we set it, and return the current message queue
        // Typically only on a post/put/patch/delete request, followed by a redirect to 'get'
        request.auth.session.messages.push(message);
        return request.auth.session.messages;

      };

      if (err) {
        return reply(err);
      }

      return reply.continue();
    };

    load();

  });

  server.ext('onPreResponse', function (request, reply) {
    if (request.auth.session && request.auth.session.messages && request.auth.session.messages.length > 0) {
      let id = request.auth.session[settings.sessionId] + '-flash';
      settings.cache.set(id, request.auth.session.messages, settings.expires, function (err) {
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