function flush(scope) {

    // error proof flush method
    try {
        $timeout.flush();
    } catch (e) {}
    try {
        $httpBackend.flush();
    } catch (e) {}
    try {
        scope.$digest();
    } catch (e) {}

}
