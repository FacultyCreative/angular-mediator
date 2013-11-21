describe('Module: lsMediator', function() {

    // ------------------------------
    // Variables 
    // ------------------------------
    var lsMediator,
        lsMediatorProviderCache,
        rootScope,
        provider,
        service,
        mock,
        $rootScope,
        $scope;


    // load module we are testing
    beforeEach(module('lsMediator'));

    // inject providers
    beforeEach(module(function(lsMediatorProvider) {

        // cache the provider, so we can access
        // it later within our tests. 
        lsMediatorProviderCache = lsMediatorProvider;

    }));

    // inject services
    beforeEach(inject(function(_$rootScope_, _lsMediator_) {

        // get injected services
        $rootScope = _$rootScope_;
        lsMediator = _lsMediator_;

        // create a new scope, which later we assign as the scope
        // for our authController.
        $scope = $rootScope.$new();

        // create local reference to fresh data mock
        mock = mediatorMock;
        spyOn(mock, 'respond').andCallThrough();

        spyOn($rootScope, '$broadcast').andCallThrough();   

    }));

    describe('lsMediator Provider', function() {

        it('provides a wildcard matcher', function() {
            lsMediator.listen('*').act(mock.getTest(1));
            $scope.$broadcast('event:login:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset(); // reset spy
            lsMediator.listen('*').act(mock.getTest(2));
            $scope.$emit('event:login:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));

            lsMediator.listen('event:login:success');

            lsMediator.listen('*').act(mock.getTest(1));
            lsMediator.listen('*:login:success').act(mock.getTest(2));
            lsMediator.listen('**:login:success').act(mock.getTest(3));
            lsMediator.listen('**:success').act(mock.getTest(4));
            lsMediator.listen('*:*:success').act(mock.getTest(5));
            lsMediator.listen('event:*:success').act(mock.getTest(6));
            lsMediator.listen('event:*').act(mock.getTest(7));

            lsMediator.listen('event:*:failure').act(mock.getTest(11));
            lsMediator.listen('**:failure').act(mock.getTest(12));

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

        it('matches a single-level deep with the wildcard matcher', function() {
            lsMediator.listen('*:login:success').act(mock.getTest(1));
            lsMediator.listen('*:somethingelse:success').act(mock.getTest(2));
            $scope.$broadcast('event:login:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset();
            $scope.$broadcast('event:somethingelse:success');
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
        });

        it('matches infinitely deep with the globstar matcher', function() {
            lsMediator.listen('**:success').act(mock.getTest(1));
            lsMediator.listen('**:error').act(mock.getTest(2));
            $scope.$broadcast('anything:goes:here:success');
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            mock.respond.reset();
            $scope.$broadcast('anything:goes:here:error');
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
        });

        it('accepts regular expressions', function() {
            lsMediator.listen(/:success$/).act(mock.getTest(1));
            lsMediator.listen(/:error$/).act(mock.getTest(2));
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

        it('provides a listen method for events', function() {

            lsMediator.listen('event:login:success').act(mock.getTest(1));
            lsMediator.listen('event:login:failure').act(mock.getTest(2));

            $scope.$emit('event:login:success');

            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));

        });

        it('provides an unlisten action', function() {
            lsMediator.listen('*').act(mock.getTest(1));
            lsMediator.unlisten('*');

            $scope.$emit('any:cool:event');

            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));

            lsMediator.listen(/success$/).act(mock.getTest(2));
            lsMediator.unlisten(/success$/);

            $scope.$emit('cool:event:success');

            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
        });

        it('ignores [***] and greater wild-card matching patterns', function() {

            expect(function() { lsMediator.listen('***').act(mock.getTest(1)); }).toThrow();
            expect(function() { lsMediator.listen('***:login:success').act(mock.getTest(1)); }).toThrow();
            expect(function() { lsMediator.listen('*********').act(mock.getTest(1)); }).toThrow();

            $scope.$emit('event:login:success');

            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(2));
            expect(mock.respond).not.toHaveBeenCalledWith(mock.testResult(3));

        });

        it('supports registration of multiple actions on the same listener', function() {

            lsMediator.listen('event:login:success');

            lsMediator.listen('event:login:success').act(mock.getTest(1));
            lsMediator.listen('event:login:success').act(mock.getTest(2));
            lsMediator.listen('event:login:success').act(mock.getTest(3));
            lsMediator.listen('event:login:success').act(mock.getTest(4));

            $scope.$emit('event:login:success');

            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(1));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(2));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(3));
            expect(mock.respond).toHaveBeenCalledWith(mock.testResult(4));

        });

        it('provides actor with the original event object and payload', function() {

            lsMediator.listen('event:login:success').act(mock.getPayloadTest());
            lsMediator.listen('event:login:failure').act(mock.getPayloadTest());

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

        it('allows chaining of .listen().act().act()', function() {

            lsMediator.listen('event:login:success');

            lsMediator
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

    });

});
