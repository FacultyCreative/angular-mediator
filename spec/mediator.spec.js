describe('Module: Mediator', function() {

    // ------------------------------
    // Variables 
    // ------------------------------
    var Mediator,
        MediatorProviderCache,
        rootScope,
        provider,
        service,
        mock,
        $rootScope,
        $scope;


    // load module we are testing
    beforeEach(module('Mediator'));

    // inject providers
    beforeEach(module(function(MediatorProvider) {

        // cache the provider, so we can access
        // it later within our tests. 
        MediatorProviderCache = MediatorProvider;

    }));

    // inject services
    beforeEach(inject(function(_$rootScope_, _Mediator_) {

        // get injected services
        $rootScope = _$rootScope_;
        Mediator = _Mediator_;

        // create a new scope, which later we assign as the scope
        // for our authController.
        $scope = $rootScope.$new();

        // create local reference to fresh data mock
        mock = mediatorMock;
        spyOn(mock, 'respond').andCallThrough();

        spyOn($rootScope, '$broadcast').andCallThrough();   

    }));

    describe('Mediator Provider', function() {

        it('provides a wildcard matcher', function() {
            Mediator.listen('*').act(mock.getTest(1));
            $scope.$broadcast('event:login:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset(); // reset spy
            Mediator.listen('*').act(mock.getTest(2));
            $scope.$emit('event:login:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));

            Mediator.listen('event:login:success');

            Mediator.listen('*').act(mock.getTest(1));
            Mediator.listen('*:login:success').act(mock.getTest(2));
            Mediator.listen('**:login:success').act(mock.getTest(3));
            Mediator.listen('**:success').act(mock.getTest(4));
            Mediator.listen('*:*:success').act(mock.getTest(5));
            Mediator.listen('event:*:success').act(mock.getTest(6));
            Mediator.listen('event:*').act(mock.getTest(7));

            Mediator.listen('event:*:failure').act(mock.getTest(11));
            Mediator.listen('**:failure').act(mock.getTest(12));

            $scope.$emit('event:login:success');

            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(3));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(4));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(5));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(6));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(7));

            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(11));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(12));
        });

        it('matches a single-level deep', function() {
            Mediator.listen('*:login:success').act(mock.getTest(1));
            Mediator.listen('*:somethingelse:success').act(mock.getTest(2));
            $scope.$broadcast('event:login:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset();
            $scope.$broadcast('event:somethingelse:success');
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
        });

        it('matches infinitely deep', function() {
            Mediator.listen('**:success').act(mock.getTest(1));
            Mediator.listen('**:error').act(mock.getTest(2));
            $scope.$broadcast('anything:goes:here:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset();
            $scope.$broadcast('anything:goes:here:error');
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
        });

        it('accepts regular expressions', function() {
            Mediator.listen(/:success$/).act(mock.getTest(1));
            Mediator.listen(/:error$/).act(mock.getTest(2));
            $scope.$broadcast('user:login:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset();
            $scope.$broadcast('user:login:error');
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset();
            $scope.$broadcast('successful:update:error');
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
        });

        it("doesn't yuck with the $broadcast or $emit chains", function() {
            var $nestedScope = $scope.$new();
            var eventName;

            expect(eventName).toBe(undefined);

            $nestedScope.$on('some:cool:event', function(event) {
                eventName = event.name;
            });
            Mediator.listen(/event$/).act(mock.getTest(1));

            $rootScope.$broadcast('some:cool:event');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(eventName).toEqual('some:cool:event');

            $nestedScope.$on('another:great:event', function(event) {
                eventName = event.name;
            });
            Mediator.listen(/^another/).act(mock.getTest(2));
            $deeplyNestedScope = $nestedScope.$new();

            $deeplyNestedScope.$emit('another:great:event');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
            expect(eventName).toEqual('another:great:event');
        });

        it('should provide a method to listen for events and run actions when those events happen', function() {

            //registers an event for listening
            Mediator.listen('event:login:success');

            Mediator.listen('event:login:success').act(mock.getTest(1));
            Mediator.listen('event:login:failure').act(mock.getTest(2));

            $scope.$emit('event:login:success');

            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));

        });

        it('should ignore [***] and greater wild-card matching patterns', function() {

            Mediator.listen('event:login:success');

            Mediator.listen('***').act(mock.getTest(1));
            Mediator.listen('***:login:success').act(mock.getTest(2));
            Mediator.listen('*********').act(mock.getTest(3));

            $scope.$emit('event:login:success');

            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(3));

        });

        it('should support registering multiple actions on the same listener', function() {

            Mediator.listen('event:login:success');

            Mediator.listen('event:login:success').act(mock.getTest(1));
            Mediator.listen('event:login:success').act(mock.getTest(2));
            Mediator.listen('event:login:success').act(mock.getTest(3));
            Mediator.listen('event:login:success').act(mock.getTest(4));

            $scope.$emit('event:login:success');

            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(3));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(4));

        });

        it('should provide actor with the original event object and payload', function() {

            Mediator.listen('event:login:success').act(mock.getPayloadTest());
            Mediator.listen('event:login:failure').act(mock.getPayloadTest());

            $scope.$emit('event:login:success', 'PAYLOAD');
            $scope.$emit('event:login:success', {});
            $scope.$emit('event:login:success', false);

            $scope.$emit('event:login:failure', 'FAIL_1');
            $scope.$emit('event:login:failure', 'FAIL_2');

            expect(mock.respond).toHaveBeenCalledWith('event:login:success', 'PAYLOAD');
            expect(mock.respond).toHaveBeenCalledWith('event:login:success', {});
            expect(mock.respond).toHaveBeenCalledWith('event:login:success', false);

            // testing for cross contaminated payloads 
            expect(mock.respond).not.toHaveBeenCalledWith('event:login:failure', 'PAYLOAD');
            expect(mock.respond).not.toHaveBeenCalledWith('event:login:success', 'FAIL_1');

        });

        // @note callback should NOT broadcast the same event name for obvious reasons! 
        // we cant test against stupidity :)
        it('should not create an infinite loop if callback contains a $broadcast()!', function() {

            Mediator.listen('event:login:success').act(function(event, payload) {
                $rootScope.$broadcast('TEST_SUCCESS_FANCY');
            });

            $scope.$emit('event:login:success');

            expect($rootScope.$broadcast).toHaveBeenCalledWith('TEST_SUCCESS_FANCY');

        });

        it('should allow chaining of .listen().act().act()', function() {

            Mediator.listen('event:login:success');

            Mediator
                .listen('event:login:success')
                .act(mock.getTest(1))
                .act(mock.getTest(2))
                .act(mock.getTest(3))
                .act(mock.getTest(4));

            $scope.$emit('event:login:success');

            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(3));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(4));

        });

        it('should provide listen, unlisten, and act as public api', function() {

            expect(Object.keys(Mediator).length).toEqual(3);
            expect(Mediator.listen).toBeDefined();
            expect(Mediator.unlisten).toBeDefined();
            expect(Mediator.act).toBeDefined();

        });

        // @todo integrate this with another test since its less documentation
        // and more of a bug fix 
        it('will not duplicate listeners when using wild cards ', function() {

            Mediator.listen('event:login:success').act(mock.getTest(1));
            Mediator.listen('*').act(mock.getTest(2));

            $rootScope.$broadcast('event:login:success');

            expect(mock.respond.callCount).toEqual(2);
            mock.respond.reset();

            $rootScope.$broadcast('event:login:success');

            expect(mock.respond.callCount).toEqual(2);
            mock.respond.reset();


            $rootScope.$broadcast('event:login:success');

            expect(mock.respond.callCount).toEqual(2);
            mock.respond.reset();

        });

        // we don't need this for now
        //it('should provide a method for de-registering event actions', function() {});

    });

});
