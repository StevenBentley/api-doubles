const expect = require('chai').expect
const { baseDouble, postBaseDouble, badUrlDouble, base301Double, sameUrl301BaseDouble, noRequestDouble,
    noResponseDouble
} = require('./testDoubles')

const Server = require('../../src/Server')
const client = require("axios");

describe('Server', () => {
    let server
    beforeEach(() => {
        server = new Server
    })

    describe('start()', () => {
        afterEach(() => server.stop())

        it('defaults to a port when none is provided', () => {
            server.start()

            return client.get('http://localhost:8001').catch(({response}) => expect(response.status).to.eq(404))
        })

        it('uses a port when provided', () => {
            server.start(8002)

            return client.get('http://localhost:8002').catch(({response}) => expect(response.status).to.eq(404))
        })

    })

    describe('serve()', () => {

        afterEach(() => server.stop())

        it('configures routes according given config parameter', async () => {

            server.serve({ httpPort: 8001, doubles: [postBaseDouble] })

            const response = await client.post('http://localhost:8001/some-example')

            expect(response.data).to.deep.equal(postBaseDouble.response.data)

        })


        it('reconfigures routes last given config parameters', async () => {

            server.serve({ httpPort: 8001, doubles: [postBaseDouble]})
            server.stop()

            const newDouble = {
                ...postBaseDouble,
                response: {
                    ...postBaseDouble.response,
                    data: { name: 'Osamah' }
                }
            }

            server.serve({ httpPort: 8001, doubles: [ newDouble ]})

            const response = await client.post('http://localhost:8001/some-example')

            expect(response.data).to.deep.equal(newDouble.response.data)

        })


    })

    describe('request()', () => {
        it('returns with status as 404 when no double is registered with provided url', () => {
            server.request('get', 'http://localhost:8000/bad-url')

            expect(server.response.status).to.eq(404)
        })

        it('returns a response', () => {
            server.registerDouble(baseDouble)

            expect(server.request('GET', 'http://localhost:8001/some-example')).to.deep.equal(baseDouble.response)
        })

        it('returns a response with content', () => {
            server.registerDouble(baseDouble)
            let testDouble = server.request('GET', 'http://localhost:8001/some-example')

            expect(testDouble.hasOwnProperty('content')).to.be.true
        })
    })

    describe('removeAllDoublesWithUri()', () => {
        it('removes all doubles that have the provided uri', () => {
            const uri = 'http://localhost:8000/bad-url'

            server.registerDouble(badUrlDouble)
            server.removeAllDoublesWithUri(uri)

            expect(server.isRegistered(uri)).to.be.false
        })

        it('removes multiple doubles with the same uri', () => {
            const uri = 'http://localhost:8001/some-example'

            server.registerDouble(baseDouble)
            server.registerDouble(postBaseDouble)
            server.removeAllDoublesWithUri(uri)

            expect(server.isRegistered(uri)).to.be.false
        })

        it('only removes double with provided url', () => {
            const someExampleUrl = 'http://localhost:8001/some-example'
            const redirectUrl = 'http://localhost:8001/301-example'

            server.registerDouble(baseDouble)
            server.registerDouble(base301Double)
            server.removeAllDoublesWithUri(someExampleUrl)

            expect(server.isRegistered(someExampleUrl)).to.be.false
            expect(server.isRegistered(redirectUrl)).to.be.true
        })
    })

    describe('registerDouble()', () => {
        it('registers a double', () => {
            server.registerDouble(baseDouble)

            expect(server.allDoubles).contains(baseDouble)
        })

        it('replaces double in allDoubles if double exists', () => {
            server.registerDouble(baseDouble)
            server.registerDouble(sameUrl301BaseDouble)
            let response = server.request('GET', "http://localhost:8001/some-example")

            expect(server.allDoubles.length).equal(1)
            expect(response.status).equal(301)
        })

        it('does not replace double in allDoubles if method is different', () => {
            server.registerDouble(baseDouble)
            server.registerDouble(postBaseDouble)
            let response = server.request('GET', "http://localhost:8001/some-example")

            expect(server.allDoubles.length).equal(2)
            expect(response.status).equal(200)
        })

        it('throws malformed double error if double is missing request', () => {
            expect(() => server.registerDouble(noRequestDouble)).to.throw('Double missing request property.')
        })

    })

    describe('isRegistered()', () => {
        it('returns true if uri is registered', () => {
            const uri = "http://localhost:8001/some-example"

            server.registerDouble(baseDouble)

            expect(server.isRegistered(uri)).to.be.true
        })

        it('returns false if uri is not registered', () => {
            let uri = "http://localhost:8001/some-example";

            expect(server.isRegistered(uri)).to.be.false
        })
    })

    describe('isADouble()', () => {
        it('returns true if parameter is a double', () => {
            const double = {
                request: {
                    url: 'url'
                },
            }

            expect(Server.isADouble(double)).to.be.true
        })

        it('returns false if parameter is not a double', () => {
            const missingRequestProperty = {}
            const missingUrlProperty = {
                request: {}
            }

            expect(Server.isADouble()).to.be.false
            expect(Server.isADouble(missingRequestProperty)).to.be.false
            expect(Server.isADouble(missingUrlProperty)).to.be.false
        })
    })

    describe('isArrayOfDoubles()', () => {
        it('returns true if parameter is array of doubles', () => {
            const doubles = [ {
                request: {
                    url: 'url'
                }
            }]

            expect(Server.isArrayOfDoubles(doubles)).to.be.true
        })

        it('returns false if parameter is not array of doubles', () => {
            const notAllDoubles = [ {
                request: {
                    url: 'url'
                }
            },
            { }]
            const notDoubles = {}

            expect(Server.isArrayOfDoubles(notAllDoubles)).to.be.false
            expect(Server.isArrayOfDoubles(notDoubles)).to.be.false
        })
    })

})