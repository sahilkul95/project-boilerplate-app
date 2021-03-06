import { h, Component } from 'preact';
import { Router } from 'preact-router';
import { Match } from 'preact-router/src/match';

import Login from '../routes/login';
import NotFound from '../components/error_pages/not_found';
import { Toast } from '../lib/toastr';

export default class App extends Component {

  checkLocationAccess() {
    return navigator.permissions.query({
      name: 'geolocation'
    }).then((result) => {
      if (result.state === 'granted') {
        console.log(result.state);
      } else if (result.state === 'prompt') {
        navigator.geolocation.getCurrentPosition(this.getPositions.bind(this));
        console.log(result.state);

      } else if (result.state === 'denied') {
        console.log(result.state);
        new Toast('Please allow this app to access your location.', Toast.TYPE_WARNING, Toast.TIME_NORMAL);
      }
      result.onchange = function() {
        console.log(result.state);
      };
    });
  }

  getPositions() {

  }

  beforeInstallPrompt() {
    window.addEventListener("beforeinstallprompt", ev => {
    // Stop Chrome from asking _now_
      // ev.preventDefault();

      // Create your custom "add to home screen" button here if needed.
      // Keep in mind that this event may be called multiple times,
      // so avoid creating multiple buttons!
      ev.prompt();
    });
  }

  componentWillMount() {
    // this.checkLocationAccess()
    //   .then(() => {
    //     this.beforeInstallPrompt();
    //   });
  }

  checkAdminConditions(path) {
    return path !== '/admin/forgotpassword' && path !== '/admin/resetpassword' && path !== '/admin/verify' && path !== '/admin/setpassword' && path !== '/'
      && path !== '/admin/login';
  }

  render() {
    return (
      <div>
        <div id="loader-bg">
          <div id="loader" />
        </div>
        <Match path="/">
          {
            ({path}) => {
              // if ((/\/admin\/([a-zA-Z])*/.test(path) || path === '/admin') && path !== '/admin/login' && this.checkAdminConditions(path)) {
              //   return (<AdminHeader/>);
              // }
              console.log(path);
            }
          }
        </Match>
        <div id="main-body" class="outer-most-div" style="transition: margin-left .5s;">
          <Router>
            <NotFound path ='/notFound' type="404" default/>
            <Login path="/"/>
          </Router>
        </div>
      </div>
    );
  }
}
