import React from 'react';
import { Plugin, StaticRouter } from '@umijs/runtime';
import { IncomingMessage, ServerResponse } from 'http';
import * as urlUtils from 'url';
import ReactDOMServer from 'react-dom/server';
import renderRoutes from '../renderRoutes/renderRoutes';
import { isPromise } from './utils';
import loadInitialProps from './loadInitialProps';

import { IRoute, IGetInitialProps } from '../types';

interface IRenderOpts<T> {
  staticMarkup?: boolean;
  customRender?: (element: React.ReactElement<T>) => string;
}

export interface IRenderServerOpts<T> {
  req: IncomingMessage;
  res: ServerResponse;
  url: string;
  routes: IRoute[];
  plugin: Plugin;
  initialProps?: object;
  renderOpts?: IRenderOpts<T>;
}

/**
 * render React Component in server-side with current path
 * output html string
 */
export default async function renderServer<T = any>(
  opts: IRenderServerOpts<T>,
): Promise<string> {
  const { req, res, initialProps, plugin, routes, url, renderOpts } = opts;

  const pathname = urlUtils.parse(url)?.pathname || '';
  const getInitialProps: IGetInitialProps = {
    req,
    res,
    isServer: true,
    ...initialProps,
  };

  // exec getInitialProps, load preload to get data
  const { data } = await loadInitialProps(routes, pathname, getInitialProps);
  const routeComponent = renderRoutes({ routes, plugin, extraProps: data });

  /** rendering */
  const { staticMarkup = false, customRender } = renderOpts || {};
  // support customRender
  const renderer =
    customRender ||
    ReactDOMServer[staticMarkup ? 'renderToStaticMarkup' : 'renderToString'];
  const render = renderer(
    <StaticRouter location={url}>{routeComponent}</StaticRouter>,
  );
  const renderedContent = isPromise(render) ? await render : render;
  return renderedContent;
}
