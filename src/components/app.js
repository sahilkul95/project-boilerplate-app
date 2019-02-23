import { h, Component } from 'preact';
import { Router } from 'preact-router';
import { Match } from 'preact-router/src/match';

import Header from './header';
import VerticalNavigation from './verticalNavigation';
import Login from '../routes/login';
import UserVerification from '../routes/userVerification';
import NotFound from '../components/error_pages/not_found';
import ForgotPassword from '../routes/forgotpassword';
import ResetPassword from '../routes/resetpassword';
import Profile from '../routes/profile';
import VerifyOldPassword from '../routes/verifyOldPassword';
import ChangePassword from '../routes/changePassword';
import SetPassword from '../routes/setpassword';
import Footer from './footer';
import Dashboard from '../routes/dashboard';
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
              if (path !== '/setup' && !/\/forgotpassword/.test(path) &&
               path !== '/resetpassword' && path !== '/verify' && path !== '/setpassword' && path !== '/notFound' && this.checkAdminConditions(path)) {
                return (<div><Header/><VerticalNavigation/><Footer/></div>);
              }
            }
          }
        </Match>
        <div id="main-body" class="outer-most-div" style="transition: margin-left .5s;">
          <Router>
            <NotFound path ='/notFound' type="404" default/>
            <Login path="/"/>
            <UserVerification path="/verify"/>
            <ForgotPassword path="/forgotpassword"/>
            <ResetPassword path="/resetpassword"/>
            <Profile path="/profile" />
            <VerifyOldPassword path="/verifyOldPassword" />
            <ChangePassword path="/changePassword" />
            <SetPassword path="/setpassword" />
            <Dashboard path="/dashboard" />
          </Router>
        </div>
      </div>
    );
  }
}
