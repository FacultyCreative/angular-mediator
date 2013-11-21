'use strict';

/**
 * -----------------------------------------------------------------------------
 * MEDIATOR
 * -----------------------------------------------------------------------------
 *
 * The Mediator pattern maximizes code reuse by allowing our classes to follow the
 * Single Responsibility Principle tightly, and removing (ideally all) dependencies.
 *
 * Instead of modules or classes communicating with one another directly, or maintaining
 * a list of subscribers as in the Observer pattern, in the Mediator pattern modules
 * broadcast events (via $scope#$broadcast and $scope#emit), and only the Mediator listens.
 *
 * The Mediator encapsulates application-specific logic. It knows how to respond to
 * events within a given application by calling the APIs of the other modules. It
 * sequesters away dependencies within itself, so that modules and classes have 
 * as few dependencies as possible.
 *
 * ## Example:
 *
 * Let's build an app with an Order class, representing an online order; an Invoice class 
 * that creates invoices; an Email class that sends emails; and a Notification class that
 * provides users with many types of interesting updates in a Growl-like fashion.
 * 
 * An Order could be responsible for instantiating a new invoice, sending off 
 * an email and notifying the user of success or failure, or the Email class could have a 
 * very specific Email.sendShippingLabelAndNotify() function. But both of these approaches 
 * require our classes to know too much about the functionality of other classes. They 
 * tightly couple dependencies, and render us unable to drop our classes into new projects 
 * with few or no changes.
 *
 * The Mediator approach instead encapsulates our application-specific logic within the single
 * mediator class, which itself has only one responsibility (knowing how to make our application
 * function). The mediator listens for events from the other modules, and knows how to get each
 * module to do its job at the right time, so that our user receives their email:
 *
 *      angular.module('application', [])
 *          .factory('ApplicationLogic', [
 *              'Mediator', 'Order', 'Invoice', 'Email', 'Notification',
 *                  function(Mediator, Order, Invoice, Email, Notification) {
 *                      
 *                      Mediator.listen('order:instantiation:success').act(function(event, order) {
 *                          new Invoice(order);
 *                      });
 *
 *                      Mediator.listen('invoice:instantiation:success').act(function(event, invoice) {
 *                          var email = new Email(invoice);
 *                          email.send();
 *                      });
 *
 *                      Mediator.listen('email:send:success').act(function(event, email) {
 *                          var address = email.address;
 *                          new Notification("Your invoice has been sent to " + address);
 *                      });
 *
 *                      Mediator.listen('email:send:failure').act(function(event, error) {
 *                          new Notification("There was an error sending your email, " + error);
 *                      });
 *                  }]);
 * 
 * With the Mediator approach, we're now free to drop our Email or Notification class into
 * another application right away and start emailing and notifying. In this way we've isolated
 * our dependencies in a separate module, the mediator, to maximize reuse of our code.
 *
 * In the example above, our classes would only be responsible for one thing, knowing that
 * they need to send updates. Thanks to Angular, they need not know to where:
 *
 *      function Order(itemId, userId) {
 *          this.itemId = itemId;
 *          this.userId = userId;
 *          $rootScope.$broadcast('order:instantiation:success');
 *      }
 *
 * Since modules should not interface directly, and the $broadcast hierarchy
 * can be disturbed by isolate scopes, we recommend placing the mediator on the
 * $rootScope, and broadcasting events from $rootScope, so that all events will
 * be heard by the mediator.
 *
 * @see http://addyosmani.com/largescalejavascript/ for more info about modular
 * patterns in large scale javascript apps.
 *
 * ## API
 *
 * The mediator provides a few simple methods for registering events & actions.
 *
 * ### Listen / Act
 * 
 *      Mediator.listen(eventName).act(function(event, payload) {});
 *
 * Listen accepts regular expressions:
 *
 *      Mediator.listen(/success$/).act(notifier.notify(event, payload));
 *      Mediator.listen(/^user/).act(currentUser.update(event, payload));
 *
 * Listen also accepts string names featuring a wildcard matcher (*) and globstar matcher (**).
 *
 * The wildcard matcher matches any string not split by a separator. The list of separators
 * is colon (:), backslash (/), period (.), question mark (?), underscore (_), 
 * ampersand (&), and semi-colon (;)
 * 
 *      Mediator.listen('*:success').act(notifier.notify(event, payload));
 *
 * Would match: `login:success` but not `user:login:success`
 *
 * The globstar matcher matches recursively through any chain of separators:
 *
 *      Mediator.listen('**:success')
 *
 * Would match `login:success` and `user:login:success`
 *
 * ### Unlisten
 * Unlisten could be called by a callback function (e.g. an event should only happen
 * once, and then stop being listened for)
 *
 *      Mediator.unlisten(eventName);
 *
 */

angular
    .module('lsMediator', [])
    .provider('lsMediator', function() {

        var listeners = [];
        var actors = [];

        var _event, _payload, _eventName;

        /**
         * --------------------------------------------
         * Private log function. These module is rather complex
         * and we want to leave the logs in place for reference
         * --------------------------------------------
         *
         */

        var $log = function() {

            var args = [];

            // arguments will be be an object, lets make them an array
            for (var index in arguments) {
                args.push(arguments[index]);
            }

            //console.log(args);
        };


        /**
         * --------------------------------------------
         * match eventName against a pattern that MIGHT contain a wild-card
         * --------------------------------------------
         *
         * @note wild-cards come in 2 flavors
         *
         * 1. **:event = this will match **:event at any point in the string.
         *    @example **:event MATCHES some:crazy:event AND some:event
         *
         * 2. *:event = will match from beginning of string
         *    @example *:event MATCHES some:*:event NOT some:long:event
         *
         * @note this pattern is borrowed heavily from angular's route matching
         *
         */

        function wildcardMatch(eventName, watchPattern) {

            if (watchPattern.indexOf('/') == 0) {
                watchPattern = watchPattern.replace(/\//g, '');
                var reg = new RegExp(watchPattern);
            } else {
                // return if no wild-card pattern
                if (watchPattern.indexOf('*') === -1) return false;

                // we don't support *** wildcards
                if (watchPattern.indexOf('***') !== -1) return false;

                // we replace our * wild-card with a regular expression which
                // matches the beginning of a string, stopping at the next
                // character from set [: / ? & ;]
                //
                // ^ matches at the beginning of the string
                var matcher = watchPattern
                // replace double wildcard with .*
                .replace(/\*\*/g, '.*')
                // replace any * instance with pattern that will search until
                // next [: / ? & ;] item
                .replace(/\*/g, '[^:/.?_&;]*')
                // finally replace any . with .* with allows for ** to match
                // to beginning of string.
                .replace(/\./, '.*');

                // look for matcher from beginning of string
                var reg = new RegExp('^' + matcher);
            }

            var isMatch = !! reg.exec(eventName);

            $log('matcher ', matcher, 'reg', reg, 'eventName ', eventName, 'isMatch ', isMatch);

            return isMatch;

        }


        /**
         * --------------------------------------------
         * Gets all registered actors for an event.
         * --------------------------------------------
         *
         */

        function getAllActorsForEvent(eventName) {

            // get obvious matches
            var eventActors = actors[eventName] || [];

            // check for wild-card matches
            for (var index in actors) {
                if (wildcardMatch(eventName, index)) {
                    eventActors = eventActors.concat(actors[index]);
                }
            }

            return eventActors;

        }


        /**
         * --------------------------------------------
         * Call an array of functions
         * @note this is no longer recursive as that was required due to
         *       error where events were being piling up because
         *       when we did our wild-card match we pushed array inside of array
         *       instead of merging arrays together.
         * --------------------------------------------
         *
         */

        function callActors(fnArray) {

            for (var index in fnArray) {

                var fnOrArray = fnArray[index];

                if (typeof fnOrArray === 'function') fnOrArray(_event, _payload);

            }

        }


        /**
         * --------------------------------------------
         * $get method will return public interface
         * --------------------------------------------
         *
         * @note functions defined on this will be available in
         * the app config block
         *
         */

        this.$get = [
            '$rootScope',
            function($rootScope) {

                var $broadcast = angular.copy($rootScope.$broadcast);
                var $emit      = angular.copy($rootScope.$emit);

                $rootScope.$emit = function(name, args) {
                    PublicInterface.listen(name);
                    return $emit.call(this, name, args);
                };

                $rootScope.$broadcast = function(name, args) {
                    PublicInterface.listen(name);
                    return $broadcast.call($rootScope, name, args);
                };

                /**
                 * --------------------------------------------
                 * generic callback for broadcasts
                 * ANY events we're registered with .listen()
                 * will run this callback
                 * --------------------------------------------
                 *
                 */

                function eventCb(event, payload) {

                    $log('Event occured: ' + event.name);

                    // we later passt
                    _event = event;
                    _payload = payload;

                    var eventActors = getAllActorsForEvent(event.name);

                    $log('we need to act on ' + eventActors.length + ' matched listeners.');
                    // @note Each listener will contain an array of functions to call

                    // should never happened, but just in case
                    if (!eventActors) return;

                    callActors(eventActors);

                }


                /**
                 * --------------------------------------------
                 * adds function to listener array
                 * also registers this event with the broadcast event
                 * and stores a de-register function
                 * --------------------------------------------
                 *
                 */

                function addListener(eventName) {

                    // get current listeners for this event name
                    var existingListener = listeners[eventName];

                    // we only need to register an event 1 time, so return
                    // if the event is already being listened for
                    if (existingListener) return;

                    // add $rootScope on listener, 
                    // and register that listener function in our listeners
                    // array which will allow us to de-register this event if we need
                    listeners[eventName] = $rootScope.$on(eventName, eventCb);

                    //$log('Remove functions for ' + eventName + ' are now', listeners[eventName]);
                    $log('Added listener for ' + eventName);

                }

                /**
                 * --------------------------------------------
                 * Removes a listener by calling its de-register function
                 * --------------------------------------------
                 *
                 */

                function removeListener(eventName) {

                    var reRegisterFunction = listeners[eventName];

                    $log(reRegisterFunction.toString());

                    if (typeof reRegisterFunction === 'function') {
                        reRegisterFunction();
                        listeners[eventName] = null;
                        $log(reRegisterFunction.toString());
                    }

                }


                /**
                 * --------------------------------------------
                 * adds function to eventName array
                 * --------------------------------------------
                 *
                 */

                function addActor(eventName, fn) {

                    // check for an actors array of functions for this eventName
                    // if not, create one
                    var namedActors = actors[eventName];

                    if (!namedActors) actors[eventName] = namedActors = [];

                    // now push our actor function
                    namedActors.push(fn);

                    //$log('registering actor for ' + eventName, namedActors);
                    //$log('there are now ', namedActors.length, ' actors for this event')

                }

                /**
                 * --------------------------------------------
                 * Public interface methods
                 * --------------------------------------------
                 *
                 */

                var PublicInterface = {
                    listen: function(eventName) {
                        // this will make eventName available in
                        // the function chain
                        _eventName = eventName;

                        addListener(_eventName);

                        // chainable
                        return PublicInterface;
                    },
                    unlisten: function(eventName) {
                        removeListener(eventName);
                        return PublicInterface;
                    },
                    act: function(fn) {
                        addActor(_eventName, fn);

                        // chainable
                        return PublicInterface;
                    },
                };

                return PublicInterface;
            }
        ];

    });
