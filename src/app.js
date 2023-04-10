/* eslint-disable no-console */
import * as path from 'node:path';
import { dirname } from 'desm';
import render from '@koa/ejs';
import oidcRoutes from './routes/oidcRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import setupProvider from "./implementation/setup-provider.js";
import serve from 'koa-static';

const __dirname = dirname(import.meta.url);

const { PORT = 3000 } = process.env;

let server;

try {
    const provider = await setupProvider()
    render(provider.app, {
        cache: false,
        viewExt: 'ejs',
        layout: '_layout',
        root: path.join(__dirname, 'views'),
    });
    provider.use(oidcRoutes(provider).routes());
    provider.use(apiRoutes(provider).routes());
    provider.use(serve('frontpage/dist'));
    provider.use(serve('styles/dist'));
    server = provider.listen(PORT, () => {
        console.log(`application is listening on port ${PORT}, check its /.well-known/openid-configuration`);
    });
} catch (err) {
    if (server?.listening) server.close();
    console.error(err);
    process.exitCode = 1;
}
