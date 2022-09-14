const App = require('../../src/Server')
const client = require('axios')
const {response} = require("express");
const expect = require('chai').expect
const fs =require('fs')
const path = require("path");

const downloadPath = './deleteMeBundle.js'

describe('App',
    () => {
        const app = new App;

        afterEach(() => {
            app.stop()
        })

        it('returns status 200 when hitting registered endpoint', () => {
            const url = 'http://localhost:8001/'
            const config = {}
            const simpleDouble = {
                request: {
                    url: url,
                }
            }
            config.doubles = [simpleDouble]

            app.serve(config)

            return client.get(url)
                .then(response => expect(response).to.have.property('status', 200))
        })

        it('returns status 200 when hitting registered endpoint and no status included in double', () => {
            const url = 'http://localhost:8001/noStatusInConfig'
            const config = {}
            const simpleDouble = {
                request: {
                    url: url,
                }
            }
            config.doubles = [simpleDouble]

            app.serve(config)

            return client.get(url)
                .then(response => expect(response).to.have.property('status', 200))

        })

        it('returns expected payload for GET', () => {
            const url = 'http://localhost:8001/getPayloadTest'
            const expectedPayload = 'expectedPayload'
            const config = {}
            const simpleDouble = {
                request: {
                    url: url,
                },
                response: {
                    data: expectedPayload,
                }
            }
            config.doubles = [simpleDouble]

            app.serve(config)
            return client.get(url)
                .then(response => {
                    expect(response).to.have.property('data', expectedPayload)
                    expect(response).to.have.property('status', 200)
                })

        })

        it('returns expected payload for POST', () => {
            const url = 'http://localhost:8001/postPayloadTest'
            const expectedPayload = 'plainTextPayload'
            const config = {}
            const simpleDouble = {
                request: {
                    method: 'POST',
                    url: url,
                },
                response: {
                    data: expectedPayload,
                }
            }
            config.doubles = [simpleDouble]

            app.serve(config)
            return client.post(url)
                .then(response => {
                    expect(response).to.have.property('data', expectedPayload)
                    expect(response.headers['content-type']).to.eq('text/html; charset=utf-8')
                })

        })

        it('can return json in response data', () => {
            const url = 'http://localhost:8001/Json'
            const expectedPayload = {"arbitraryPayload": true}
            const config = {}
            const simpleDouble = {
                request: {
                    url: url,
                },
                response: {
                    data: expectedPayload,
                }
            }
            config.doubles = [simpleDouble]

            app.serve(config)
            return client.get(url)
                .then(response => {
                    expect(response.data).to.deep.eq(expectedPayload)
                    expect(response.headers['content-type']).to.eq('application/json; charset=utf-8')
                })
        })

        it('returns status 404 when hitting not registered endpoint', () => {

            app.serve()

            return client.get('http://localhost:8001/not-registered')
                .catch(err => {
                    return expect(err.response).to.have.property('status', 404)
                })
        })

        it('selects correct double', () => {
            const config = {}
            const simpleDoubleGet1 = {
                request: {
                    url: 'http://localhost:8001/simpleDoubleGet1',
                },
                response: {
                    data: 'simpleDouble1Payload',
                }
            }

            //fixturesFolder
            const simpleDoubleGet2 = {
                request: {
                    url: 'http://localhost:8001/simpleDoubleGet2',
                },
                response: {
                    data: 'simpleDouble2Payload',
                }
            }
            config.doubles = [simpleDoubleGet1, simpleDoubleGet2]

            app.serve(config)

            return client.get('http://localhost:8001/simpleDoubleGet2')
                .then(response => {
                    expect(response).to.have.property('data', 'simpleDouble2Payload')
                })

        })

        //look into using a second localhost as the redirect endpoint
        it('can redirect 301', () => {
            const endPointUrlThatRedirects = 'http://localhost:8001/redirect-from';
            // const redirectDestination = 'http://localhost:8001/redirect-to';
            const double = {
                request: {
                    url: endPointUrlThatRedirects
                },
                response: {
                    status: 301,
                    redirectURL: 'http://google.com'
                }
            }

            app.load(double)
            app.serve()

            return client.get(endPointUrlThatRedirects)
                .then(response => {
                    //console.log(response.request.socket._host)
                    //console.log(response)
                    expect(response.status).to.eq(200)
                    expect(response.request.socket).to.have.property('_host', 'www.google.com')
                })
        })

        it('can redirect 302', () => {
            const endPointUrlThatRedirects = 'http://localhost:8001/redirect-from';
            // const redirectDestination = 'http://localhost:8001/redirect-to';
            const double = {
                request: {
                    url: endPointUrlThatRedirects
                },
                response: {
                    status: 302,
                    redirectURL: 'http://google.com'
                }
            }

            app.load(double)
            app.serve()

            return client.get(endPointUrlThatRedirects)
                .then(response => {
                    //console.log(response.request.socket._host)
                    //console.log(response)
                    expect(response.status).to.eq(200)
                    expect(response.request.socket).to.have.property('_host', 'www.google.com')
                })
        })

        it('can serve a resource file', () => {
            // Make sure it's not already there
            if (fs.existsSync('./deleteMeBundle.js')) {
                fs.unlinkSync('./deleteMeBundle.js')
                console.log('DELETED FILE before')
            }

            const resourceUrl = 'http://localhost:8001/doubles/GetMeBundle.js'
            const pathToResourceFile = './test/resourceFiles/bundle.js';
            const double = {
                request: {
                    url: resourceUrl
                },
                attachment: {pathToFile: pathToResourceFile},
                response: {
                }
            }
            app.load(double)
            app.serve()

            const axiosConfig = {
                responseType: 'stream'
            }

            return client.get(resourceUrl, axiosConfig)
                .then(response => {
                    const downloadFile = 'deleteMeBundle.js';
                    let stream = fs.createWriteStream(downloadFile)
                    stream.once("finish", () => {
                        expect(response.headers['content-type']).to.eq('application/javascript; charset=UTF-8')
                        expect(response.status).to.eq(200)

                        expect(fs.existsSync(downloadFile)).to.be.true

                        const bundleJs = fs.readFileSync(pathToResourceFile).toString()
                        const deleteMeBundleJs = fs.readFileSync(downloadFile).toString()

                        expect(bundleJs).to.eq(deleteMeBundleJs)

                        fs.unlinkSync(downloadFile)
                    })
                    response.data.pipe(stream)
                })

        })

        it('defaults to a port when none is provided', () => {
            app.serve()
            return client.get('http://localhost:8001/').then(response => expect(response.status).to.eq(200))
        })

        it('passes http port when provided in config object', () => {
            app.serve({httpPort: 8002})
            return client.get('http://localhost:8002/').then(response => expect(response.status).to.eq(200))
        })

        // it('passes https port when provided in config object', () => {
        //     app.serve({httpsPort: 8003})
        //
        //     return client.get('https://localhost:8003')
        //         .then(response =>
        //             expect(response.status).to.eq(200))
        // })

        //TODO put the double into a config and pass to serve
        it('double is available when it is added', () => {
            const double = {
                request: {
                    method: 'GET',
                    url: 'http://localhost:8003/example'
                }
            }
            app.load(double)

            app.serve({httpPort: 8003})

            return client.get('http://localhost:8003/example').then(response => expect(response.status).to.eq(200))

        })

        it('can respond to post requests', () => {
            let urlToPostTo = 'http://localhost:8001/example'
            const double = {
                request: {
                    method: 'POST',
                    url: urlToPostTo
                }
            }
            app.load(double)

            app.serve()

            return client.post(urlToPostTo, {data: "data"}).then(response => expect(response.status).to.eq(200))
        })

        describe('fixtures', () => {

            it('can load data from a fixture', () => {
                const urlToEndpointThatLoadsResponseFromFixture = 'http://localhost:8001/FixtureThisBatman'
                const fixtureFileName = 'arbitraryFixture.js'
                let fullyResolvedPathToFixture = path.resolve('./test/fixtures', fixtureFileName)
                let expectedData = require(fullyResolvedPathToFixture)

                const config = {
                    httpPort: 8001,
                    fixturesFolder: 'test/fixtures',
                    doubles: [
                        {
                            request: {
                                url: urlToEndpointThatLoadsResponseFromFixture,
                            },
                            response: {
                                fixture: fixtureFileName,
                            }
                        }
                    ]
                }
                app.serve(config)

                return client.get(urlToEndpointThatLoadsResponseFromFixture)
                    .then(response => {
                        expect(response.status).to.eq(200)
                        expect(response.data).to.deep.eq(expectedData)
                        expect(response.headers['content-type']).to.eq('application/json; charset=utf-8')
                    })
            })

            it('should default to test/fixtures for fixture location', () => {
                const urlToEndpointThatLoadsResponseFromFixture = 'http://localhost:8001/FixtureThisBatman'
                const fixtureFileName = 'arbitraryFixture.js'
                let fullyResolvedPathToFixture = path.resolve('./test/fixtures', fixtureFileName)
                let expectedData = require(fullyResolvedPathToFixture)

                const config = {
                    doubles: [
                        {
                            request: {
                                url: urlToEndpointThatLoadsResponseFromFixture,
                            },
                            response: {
                                fixture: fixtureFileName,
                            }
                        }
                    ]
                }
                app.serve(config)

                return client.get(urlToEndpointThatLoadsResponseFromFixture)
                    .then(response => {
                        expect(response.status).to.eq(200)
                        expect(response.data).to.deep.eq(expectedData)
                        expect(response.headers['content-type']).to.eq('application/json; charset=utf-8')
                    })
            })
        })

    })