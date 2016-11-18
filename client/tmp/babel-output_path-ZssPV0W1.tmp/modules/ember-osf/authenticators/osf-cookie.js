import Ember from 'ember';

import Base from 'ember-simple-auth/authenticators/base';
import config from 'ember-get-config';

import { authenticatedAJAX } from 'ember-osf/utils/ajax-helpers';

/**
 * @module ember-osf
 * @submodule authenticators
 */

/**
 * Ember-simple-auth compatible authenticator based on session cookie.
 *
 * Intended to be used with the authorizer of the same name.
 *
 * @class OsfCookieAuthenticator
 * @extends ember-simple-auth/BaseAuthenticator
 */
export default Base.extend({
    // HACK: Lets us clear session manually, rather than after .invalidate method resolves
    session: Ember.inject.service('session'),

    _test: function _test() {
        return authenticatedAJAX({
            method: 'GET',
            url: config.OSF.apiUrl + '/' + config.OSF.apiNamespace + '/users/me/',
            dataType: 'json',
            contentType: 'application/json',
            xhrFields: {
                withCredentials: true
            }
        }).then(function (res) {
            return res.data;
        });
    },
    restore: function restore() /* data */{
        return this._test().fail(this.invalidate);
    },

    /**
     * Send a request to the flask application to trigger invalidation of session remotely
     * @method invalidate
     */
    invalidate: function invalidate(data) {
        if (!data || data.id && data.status !== 401) {
            // If invalidate is called when loading the page to check if a cookie has permissions, don't redirect the user
            // But if invalidate is called without arguments, or for any other reason, interpret this as a straight logout request
            //   (and let the session get invalidated next time at the start of first page load)
            // Can't do this via AJAX request because it redirects to CAS, and AJAX + redirect = CORS issue

            // Manually clear session before user leaves the page, since we aren't sticking around for ESA to do so later
            this.get('session.session')._clear(true).then(function () {
                return window.location = config.OSF.url + 'logout/';
            });
        } else {
            // This branch is expected to be called when a test request reveals the user to lack permissions... so session should be wiped
            return Ember.RSVP.resolve();
        }
    },
    /**
     * For now, simply verify that a token is present and can be used
     * @method authenticate
     * @param code
     * @return {Promise}
     */
    authenticate: function authenticate(code) {
        var jqDeferred = this._test(code);
        return new Ember.RSVP.Promise(function (resolve, reject) {
            // TODO: Improve param capture
            jqDeferred.done(function (value) {
                return resolve(value);
            });
            jqDeferred.fail(function (reason) {
                return reject(reason);
            });
        });
    }
});