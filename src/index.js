import { route } from 'preact-router';
import App from './components/app';
import { AppStore } from './lib/store';
import http from 'axios';
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
  httpConfig.headers.push({
    name: 'Authorization',
    value: AppStore.get('token').token
  });
  httpConfig.headers.push({
    name: 'Content-Type',
    value: 'application/json'
  });
  return Promise.resolve();
};

export default App;
