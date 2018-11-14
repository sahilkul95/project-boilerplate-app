import { h, Component } from 'preact';
import { route } from 'preact-router';
import CONSTANTS from '../../lib/constants';
import { Toast } from '../../lib/toastr';
import { AppStore } from '../../lib/store';
import { stopLoader } from '../../lib/utils';
import { Link } from 'preact-router';
import http from 'fetch-bb';

export default class Login extends Component {
  login(e) {
    e.preventDefault();
    this.setState({
      isResponseReceived: true,
      email: e.target.email.value,
      password: e.target.password.value,
      shortName: this.props.matches.shortName,
      isButtonClicked: true
    });
    return http
      .post(`${CONSTANTS.API_URL}/api/auth/local`, {
        email: e.target.email.value,
        password: e.target.password.value,
        shortName: this.state.shortName
      })
      .then((response) => {
        AppStore.set('token', {
          token: response.token
        });
        this.setState({
          isResponseReceived:false,
          isButtonClicked: false
        });
        return http.get(`${CONSTANTS.API_URL}/api/user/me`)
          .then((userinfo) => {
            AppStore.set('userinfo', userinfo);
            if (this.state.redirectionUrl.url) {
              AppStore.remove('redirectionUrl');
              return route(this.state.redirectionUrl.url);
            }
            if (userinfo.company.isConsumerVerificationStage) {
              return route('consumerVerificationList/companyverificationpending?pageNo=1');
            }
            return route('/dashboard');
          });
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        this.setState({
          isResponseReceived:false,
          isButtonClicked: false
        });
        return new Toast(HTTPException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
      });
  }

  componentWillMount () {
    this.state = {
      shortName: '',
      email: '',
      password: '',
      token: '',
      isResponseReceived: false,
      isButtonClicked: false
    };
  }

  componentDidMount() {
    this.setState({ redirectionUrl: AppStore.get('redirectionUrl') });
    if (AppStore.get('token') && Object.keys(AppStore.get('token')).length){
      return http
        .get(`${CONSTANTS.API_URL}/api/validateSession/${AppStore.get('token').token}`)
        .then(() => {
          return route('/dashboard');
        })
        .catch((HTTPException) => {
          new Toast('Session Expired.', Toast.TYPE_ERROR, Toast.TIME_LONG);
          console.error(HTTPException);
          stopLoader();
          AppStore.removeAll();
          return route('/dashboard');
        });
    }
  }

  render() {
    return (
      <section class="row row-center has-text-center auth-section">
        <div class="col-xs-12 col-sm-6 col-md-5 col-lg-3 auth-center">
          <form onSubmit={this.login.bind(this)}>
            <div class="row">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <img src="/assets/static/PowerDECK_Logo.svg" /><sup>TM</sup>
              </div>
            </div>
            <div class="row box">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 auth-form">
                <div class="field">
                  <input value={this.state.email} id="email" type="email" autofocus name="email" maxlength="75" placeholder="Email"
                    disabled={this.state.isResponseReceived} required />
                  <label for="email" class="has-text-left" style="font-size:0.8em">Email</label>
                </div>
                <div class="field">
                  <input value={this.state.password} id="password" type="password" placeholder="Password"
                    disabled={this.state.isResponseReceived} required/>
                  <label for="password" class="has-text-left" style="font-size:0.8em">Password</label>
                </div>
                <button type="submit" id="loginButton" class="is-fullwidth btn-margin" style="margin-top: 5px;"
                  disabled={this.state.isButtonClicked}>Login</button>
                <div style="margin-top:3px;">
                  <p class="has-text-centered">
                    {/*<input type="checkbox" checked={this.state.isRememberMe} id="is_remember_me" name="is_remember_me" /> Remember Me | */}
                    <b> <Link class="hyperlink" href={`/forgotpassword`}>Forgot password?</Link> </b>
                  </p>
                </div>
              </div>
            </div>

          </form>
        </div>
      </section>
    );
  }
}
