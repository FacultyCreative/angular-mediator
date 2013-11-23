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
    .module('angularMediator', [])
    .provider('angularMediator', function() {

        this.$get = [
            '$rootScope',
            function($rootScope) {

                var listeners = [];
                var actors = [];
                var _eventName;

                /**
                 * Registers and event for listening by mediator
                 * @param eventName {String|RegExp} Strings will be converted to RegExp for storage
                 *
                 */

                function addListener(eventName) {
                    if (eventName.constructor == String) eventName = regexify(eventName);
                    if (eventName.constructor == RegExp) listeners.push(eventName);
                    _eventName = eventName;
                }

                /**
                 * Removes specified eventName from listeners array. Will not effect actors for evenName
                 * @param {String|RegExp} eventName Event to stop listening for
                 *
                 */

                function removeListener(eventName) {
                    if (eventName.constructor == String) eventName = regexify(eventName);
                    listeners = _.reject(listeners, function(listener) {
                        if (listener.toString() === eventName.toString()) return listener;
                    });
                }

                /**
                 * Adds function for specified event name.
                 */

                function addActor(eventName, fn) {
                    if (!actors[eventName]) actors[eventName] = [];
                    actors[eventName].push(fn);
                }

                /**
                 * Call actors for an event name. Matches each listener against RegEx event name,
                 * if a match is found, iterates though actors array where key matches event name
                 * and calls each actor function, passing original event and args.
                 * @param {String} name Name of event called with #broadcast or #emit
                 * @param {<Anything!>} args Original event args sent with event
                 *
                 */

                function callRegexes() {
                    var args = _.flatten(arguments);
                    var name = args[0];
                    _.each(listeners, function(listener) {
                        if (name.match(listener)) {
                            _.each(actors[listener], function(actor) {
                                actor.apply(actor, args);
                            });
                        }
                    });
                }

                /**
                 * Convert wildcard (*) and globstar (**) pattern strings to RegExp
                 * @returns {RegExp}
                 *
                 */

                function regexify(watchPattern) {
                    if (watchPattern.match(/\*{3,}/)) throw 'Invalid wildcard pattern "' + watchPattern + '"';
                    var matcher = watchPattern
                        .replace(/\*{2}/g, '.*')
                        .replace(/\*{1}/g, '[^:/.?_&;]*')
                        .replace(/\./, '.*');
                    return new RegExp('^' + matcher);
                }

                /**
                 * To fully support wildcard listeners, we need to hook into angular's $boardcast and $emit
                 * events. We don't want to override them - we just add a wildcard check and them
                 * call them using .call(this) to ensure proper context.
                 *
                 * Because all scopes inherit from $rootScope, even child scopes that $emit()
                 * are addressed with $rootScope.$emit
                 *
                 */
                var $broadcast = angular.copy($rootScope.$broadcast);
                var $emit = angular.copy($rootScope.$emit);


                $rootScope.$emit = function(name, args) {
                    callRegexes(arguments);
                    return $emit.apply(this, arguments);
                };

                $rootScope.$broadcast = function(name, args) {
                    callRegexes(arguments);
                    return $broadcast.apply(this, arguments);
                };

                /**
                 * PublicInterface exposes methods for interacting with mediator
                 *
                 * @method listen
                 * @param {String} eventName String or RegEx event to register with mediator
                 * @chainable
                 *
                 *
                 * @method unlisten
                 * @param {String} eventName String or RegEx to stop listening for. Will no longer
                 *     call registered actors (but will not remove actors)
                 * @chainable
                 *
                 *
                 * @method act
                 * @param {Function} fn Function called when #broadcast(event, args)
                 *    or #emit(event, args) event.name matches the eventName specified in listen(eventName)
                 * @chainable
                 *
                 */
                var PublicInterface = {
                    listen: function(eventName) {
                        addListener(eventName);
                        return PublicInterface;
                    },
                    unlisten: function(eventName) {
                        removeListener(eventName);
                        return PublicInterface;
                    },
                    act: function(fn) {
                        addActor(_eventName, fn);
                        return PublicInterface;
                    }
                };

                return PublicInterface;
            }
        ];

    });
