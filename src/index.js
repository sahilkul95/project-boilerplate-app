// import { h, render } from 'preact';
import { route, getCurrentUrl } from 'preact-router';
import App from './components/app';
import { AppStore } from './lib/store';
import http from 'fetch-bb';
import 'style/index.styl';

const HTTP_UNAUTHORIZED_CODE = 401;

http.responseInterceptor = (response, status) => {
  if (status === HTTP_UNAUTHORIZED_CODE) {
    // AppStore.removeAll();
    route(`/`);
    return Promise.resolve(response);
  }
  return Promise.resolve(response);
};

http.requestInterceptor = (httpConfig) => {
  let currentUrl = {};
  currentUrl.url = getCurrentUrl();
  if (! Object.keys(AppStore.get('token')).length && !Object.keys(AppStore.get('redirectionUrl')).length && currentUrl.url !== '/') {
    AppStore.set('redirectionUrl', currentUrl);
    route(`/`);
    return Promise.resolve();
  }
  httpConfig.headers.push({
    name: 'Authorization',
    value: 'Bearer ' + AppStore.get('token').token
  });
  httpConfig.headers.push({
    name: 'Content-Type',
    value: 'application/json'
  });
  return Promise.resolve();
};

export default App;
