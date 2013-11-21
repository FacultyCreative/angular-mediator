var mediatorMock = {
    testResult: function(variable) {
        return 'TEST_SUCCESS_' + variable;
    },
    getTest: function(variable) {
        return function(event, payload) { 
            return mediatorMock.respond(mediatorMock.testResult(variable));
        }
    },
    getPayloadTest: function() {
        return function(event, payload) { 
            return mediatorMock.respond(event.name, payload);
        }
    },
    respond: function(variable1, variable2) {
        return true;
    }
}
