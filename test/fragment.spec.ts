import "mocha";
import {expect} from "chai";
import "../src/base";
import {FragmentBFF, FragmentStorefront} from "../src/fragment";
import {IExposeFragment} from "../src/types";
import nock from "nock";
import {FRAGMENT_RENDER_MODES, RESOURCE_INJECT_TYPE, RESOURCE_LOCATION} from "../src/enums";
import {RESOURCE_TYPE} from "../src/lib/enums";

    describe('Fragment', () => {
        describe('BFF', () => {
            const commonFragmentBffConfiguration: any = {
                name: 'test',
                version: 'test',
                render: {
                    url: "/"
                },
                versions: {
                    "test": {
                        assets: [],
                        dependencies: [],
                        handler: {}
                    }
                }
            };

            it('should create a new FragmentBFF', () => {
                const fragmentConfig = JSON.parse(JSON.stringify(commonFragmentBffConfiguration));
                fragmentConfig.versions.test.handler.content = () => {
                };
                const fragment = new FragmentBFF(fragmentConfig);
                expect(fragment).to.be.instanceOf(FragmentBFF);
            });

            it('should render fragment as json format', async () => {
                const fragmentConfig = JSON.parse(JSON.stringify(commonFragmentBffConfiguration));
                fragmentConfig.versions.test.handler.content = (req: any, data: any) => {
                    return {
                        main: `${data} was here`
                    };
                };
                fragmentConfig.versions.test.handler.data = () => {
                    return {data: 'acg'};
                };
                const fragment = new FragmentBFF(fragmentConfig);
                const response = await fragment.render({}, {});
                expect(response).to.deep.eq({
                    main: `acg was here`
                });
            });

            it('should render placeholder preview', async () => {
                const fragmentConfig = JSON.parse(JSON.stringify(commonFragmentBffConfiguration));
                fragmentConfig.versions.test.handler.placeholder = () => {
                    return 'placeholder';
                };
                const fragment = new FragmentBFF(fragmentConfig);
                const response = await fragment.placeholder({});
                expect(response).to.eq('placeholder');
            });

            it('should throw at render error when not static and no data', done => {
                const fragmentConfig = JSON.parse(JSON.stringify(commonFragmentBffConfiguration));
                fragmentConfig.versions.test.handler.content = (req: any, data: any) => `${data} was here`;
                const fragment = new FragmentBFF(fragmentConfig);
                fragment.render({}, {}).then(data => done(data)).catch(e => {
                    expect(e.message).to.include('Failed to find data handler');
                    done();
                });
            });

            // it('should render fragment which is static without calling data', done => {
            //     const fragmentConfig = JSON.parse(JSON.stringify(commonFragmentBffConfiguration));
            //     fragmentConfig.render.static = true;
            //     fragmentConfig.versions.test.handler.content = (req: any, data: any) => `${data} was here`;
            //     fragmentConfig.versions.test.handler.data = (req: any) => {
            //         throw new Error("It shouldn't call data for static fragments");
            //     };
            //     const fragment = new FragmentBFF(fragmentConfig);
            //     fragment.render({}, {}).then(data => done()).catch(done);
            // });

            it('should throw at render when failing to find version', done => {
                const fragmentConfig = JSON.parse(JSON.stringify(commonFragmentBffConfiguration));
                fragmentConfig.versions.test.handler.content = (req: any, data: any) => `${data} was here`;
                fragmentConfig.versions.test.handler.data = () => {
                    return {data: 'acg'};
                };
                const fragment = new FragmentBFF(fragmentConfig);
                fragment.render({}, {}, 'no_version').then(data => done(data)).catch(e => {
                    expect(e.message).to.include('Failed to find fragment version');
                    done();
                });
            });

            it('should resolve module when handler is not provided', () => {
                const bff = {
                    ...commonFragmentBffConfiguration,
                    version: '1.0.0',
                    versions: {
                        "1.0.0": {
                            assets: [],
                            dependencies: [],
                        }
                    }
                };
                const fragmentConfig = JSON.parse(JSON.stringify(bff));
                expect(() => {
                    const fragment = new FragmentBFF(fragmentConfig);
                }).to.throw();
            });


            it('should throw error when fails to find requested fragment placeholder', () => {
                const bff = {
                    ...commonFragmentBffConfiguration,
                    version: '1.0.0',
                    versions: {
                        "2.0.0": {
                            assets: [],
                            dependencies: [],
                            handler: {}
                        }
                    }
                };
                const fragmentConfig = JSON.parse(JSON.stringify(bff));
                expect(() => {
                    const fragment = new FragmentBFF(fragmentConfig);
                    const placeholder = fragment.placeholder({}, '123');
                }).to.throw('Failed to find fragment version. Fragment: test, Version: 123');
            });

            it('should throw error when fails to find requested fragment content', async () => {
                const bff = {
                    ...commonFragmentBffConfiguration,
                    version: '1.0.0',
                    versions: {
                        "2.0.0": {
                            assets: [],
                            dependencies: [],
                            handler: {}
                        }
                    }
                };
                const fragmentConfig = JSON.parse(JSON.stringify(bff));
                const fragment = new FragmentBFF(fragmentConfig);

                try {
                    await fragment.render({}, {}, '123');
                } catch (err) {
                    return;
                }
                throw new Error('Should have thrown an error');
            });
        });

        describe('Storefront', () => {
            const commonFragmentConfig: IExposeFragment = {
                version: '',
                testCookie: 'test',
                assets: [],
                dependencies: [],
                render: {
                    url: '/',
                    placeholder: true
                }
            };

            it('should create new storefront fragment instance', () => {
                const fragment = new FragmentStorefront('product', 'test');

                expect(fragment).to.be.instanceOf(FragmentStorefront);
            });

            it('should update fragment configuration', () => {
                const fragment = new FragmentStorefront('product', 'test');
                fragment.update(commonFragmentConfig, 'http://local.gatewaysimulator.com');

                expect(fragment.config).to.deep.eq(commonFragmentConfig);
            });

            it('should fetch placeholder', async () => {
                const placeholderContent = '<div>placeholder</div>';
                const scope = nock('http://local.gatewaysimulator.com')
                    .get('/product/placeholder')
                    .reply(200, placeholderContent);
                const fragment = new FragmentStorefront('product', 'test');
                fragment.update(commonFragmentConfig, 'http://local.gatewaysimulator.com');

                const placeholder = await fragment.getPlaceholder();
                expect(placeholder).to.eq(placeholderContent);
            });

            it('should return empty placeholder on any exception', async () => {
                const fragment = new FragmentStorefront('product', 'test');
                fragment.update(commonFragmentConfig, 'http://local.gatewaysimulator.com');

                const placeholder = await fragment.getPlaceholder();
                expect(placeholder).to.eq('');
            });

            it('should return fragment content', async () => {
                const fragmentContent = {
                    main: '<div>fragment</div>'
                };
                const scope = nock('http://local.gatewaysimulator.com')
                    .get('/product/')
                    .query({__renderMode: FRAGMENT_RENDER_MODES.STREAM})
                    .reply(200, fragmentContent);
                const fragment = new FragmentStorefront('product', 'test');
                fragment.update(commonFragmentConfig, 'http://local.gatewaysimulator.com');

                const content = await fragment.getContent();
                expect(content.html).to.deep.eq(fragmentContent);
            });

            it('should pass fragment attributes to gateway request', async () => {
                const fragmentContent = {
                    main: '<div>fragment</div>'
                };
                const scope = nock('http://local.gatewaysimulator.com')
                    .get('/product/')
                    .query({__renderMode: FRAGMENT_RENDER_MODES.STREAM, custom: 'Trendyol'})
                    .reply(200, fragmentContent);
                const fragment = new FragmentStorefront('product', 'test');
                fragment.update(commonFragmentConfig, 'http://local.gatewaysimulator.com');


                const content = await fragment.getContent({custom: 'Trendyol'});

                expect(content.html).to.deep.eq(fragmentContent);
            });

            it('should fetch the asset with the desired name', async () => {
                const productScript = `<script>console.log('Product Script')</script>`;

                const scope = nock('http://asset-serving-test.com')
                    .get('/product/static/bundle.min.js')
                    .reply(200, productScript);

                const fragment = new FragmentStorefront('product', 'test');

                let fragmentContent = {
                    ...commonFragmentConfig
                };
                fragmentContent.assets = [
                    {
                        fileName: 'bundle.min.js',
                        location: RESOURCE_LOCATION.HEAD,
                        name: 'product-bundle',
                        injectType: RESOURCE_INJECT_TYPE.EXTERNAL,
                        type: RESOURCE_TYPE.JS
                    }
                ];

                fragment.update(fragmentContent, 'http://asset-serving-test.com');

                const scriptContent = await fragment.getAsset('product-bundle');

                expect(scriptContent).to.eq(productScript);

            });

            it('should log and return empty placeholder when no fragment config exists', (done) => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.getPlaceholder().then(placeholder => {
                    try {
                        expect(placeholder).to.eq('');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });

            it('should log and return empty placeholder when no placeholder is not enabled', (done) => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.update({
                    render: {
                        placeholder: false,
                        url: '/'
                    },
                    version: '1.0.0',
                    testCookie: 'fragment',
                    dependencies: [],
                    assets: []
                }, '');

                fragment.getPlaceholder().then(placeholder => {
                    try {
                        expect(placeholder).to.eq('');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });

            it('should log and return empty content when no fragment config exists', (done) => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.getContent().then(content => {
                    try {
                        expect(content).to.deep.eq({
                            status: 500,
                            html: {},
                            headers: {},
                            model: {}
                        });
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });

            it('should log and return null asset when no fragment config exists', (done) => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.getAsset('nope').then(asset => {
                    try {
                        expect(asset).to.eq(null);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });

            it('should log and return null asset path when no fragment config exists', () => {
                const fragment = new FragmentStorefront('product', 'test');

                const assetPath = fragment.getAssetPath('nope');

                expect(assetPath).to.eq(null);
            });

            it('should log and return null asset path when requested asset not found', () => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.update({
                    render: {
                        placeholder: false,
                        url: '/'
                    },
                    version: '1.0.0',
                    testCookie: 'fragment',
                    dependencies: [],
                    assets: []
                }, '');


                const assetPath = fragment.getAssetPath('nope');

                expect(assetPath).to.eq(null);
            });

            it('should return asset path if public asset link provided', () => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.update({
                    render: {
                        placeholder: false,
                        url: '/'
                    },
                    version: '1.0.0',
                    testCookie: 'fragment',
                    dependencies: [],
                    assets: [
                        {
                            fileName: 'bundle.min.js',
                            location: RESOURCE_LOCATION.HEAD,
                            name: 'product-bundle',
                            injectType: RESOURCE_INJECT_TYPE.EXTERNAL,
                            type: RESOURCE_TYPE.JS
                        }
                    ]
                }, 'https://different.com/', 'gateway','https://differentLink.com/');


                const assetPath = fragment.getAssetPath('product-bundle');

                expect(assetPath).to.eq(`https://differentlink.com/product/static/bundle.min.js`);
            });

            it('should return asset path if public asset external link provided', () => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.update({
                    render: {
                        placeholder: false,
                        url: '/'
                    },
                    version: '1.0.0',
                    testCookie: 'fragment',
                    dependencies: [],
                    assets: [
                        {
                            fileName: 'bundle.min.js',
                            link: 'fullPath',
                            location: RESOURCE_LOCATION.HEAD,
                            name: 'product-bundle',
                            injectType: RESOURCE_INJECT_TYPE.EXTERNAL,
                            type: RESOURCE_TYPE.JS
                        }
                    ]
                }, 'https://different.com/', 'https://differentLink.com/');


                const assetPath = fragment.getAssetPath('product-bundle');

                expect(assetPath).to.eq(`fullPath`);
            });

            it('should log and return null asset path when requested asset not found', (done) => {
                const fragment = new FragmentStorefront('product', 'test');

                fragment.update({
                    render: {
                        placeholder: false,
                        url: '/'
                    },
                    version: '1.0.0',
                    testCookie: 'fragment',
                    dependencies: [],
                    assets: [],
                }, '');


                fragment.getAsset('nope').then(asset => {
                    try {
                        expect(asset).to.eq(null);
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });
    });

