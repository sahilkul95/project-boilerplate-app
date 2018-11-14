import { h, Component } from 'preact';
import { route } from 'preact-router';
import CONSTANTS from '../../lib/constants';
import { AppStore } from '../../lib/store';
import { Toast } from '../../lib/toastr';
import http from 'fetch-bb';

export default class setPassword extends Component {

  savePasswordAndRedirectToLogin(e) {
    e.preventDefault();
    return http
      .put(`${CONSTANTS.API_URL}/api/user/${this.state.userID}/setpassword`,
        {
          newPassword: e.target.newPassword.value,
          confirmpassword: e.target.confirmNewPassword.value
        })
      .then(() => {
        new Toast('Your password has been successfully set. You can login now.', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.setState({errorMessage: ''});
        AppStore.removeAll();
        route(`/`);
      })
      .catch((HTTPException) => {
        if (HTTPException.statusCode === 409) {
          this.setState({
            isResponseReceived:false,
            isButtonClicked: false
            // shortName: ''
          });
          new Toast('Passwords do not match', Toast.TYPE_ERROR, Toast.TIME_LONG);
          return this.setState({errorMessage: 'Passwords do not match', successMessage: ''});
        }
        else if (HTTPException.statusCode === 400) {
          this.setState({
            isResponseReceived:false,
            isButtonClicked: false
            // shortName: ''
          });
          new Toast('Passwords must contain At least 6 characters, including UPPERCASE, lowercase letters, '+
           'special characters and Digits', Toast.TYPE_ERROR, Toast.TIME_LONG);
          return this.setState({errorMessage: 'Passwords must contain At least 6 characters, including UPPERCASE, lowercase letters, '+
            'special characters and Digits', successMessage: ''});
        }
        this.setState({
          isResponseReceived: false,
          isButtonClicked: false
          // shortName: AppStore.get('shortName').shortName
        });
      });
  }

  getUser() {
    return http
      .get(`${CONSTANTS.API_URL}/api/userByToken/${this.state.tokenToGetUser}`)
      .then((uid) => {
        this.setState({userID: uid._id});
      })
      .catch((DBEXception) => {
        new Toast(DBEXception.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(DBEXception);
      });
  }

  componentWillMount() {
    this.state = {
      userID: '',
      shortName: '',
      tokenToGetUser: '',
      errorMessage: '',
      successMessage: ''
    };
    // let localStorage = AppStore.get('shortName');
    this.setState({tokenToGetUser: AppStore.get('tokenForGettingUser')});
  }
  componentDidMount() {
    this.getUser();
  }

  render () {
    return (
      <section class="row row-center has-text-center auth-section">
        <div class="col-xs-12 col-sm-6 col-md-5 col-lg-3 auth-center">
          <form onSubmit={this.savePasswordAndRedirectToLogin.bind(this)}>
            <div class="row">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <img src="/assets/static/PowerDECK_Logo.svg" />
                <sup>TM</sup>
              </div>
            </div>
            <div class="row box">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <div class="row">
                  <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                    <h6 class="inline">Set Your Password</h6>
                  </div>
                </div>
                <div class="row">
                  <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 auth-form">
                    <div class="field">
                      <input value={this.password} name="newPassword" id="password" type="password" placeholder="New Password" required/>
                      <label for="password" class="has-text-left" style="font-size:0.8em">New Password</label>
                    </div>
                    <div class="field">
                      <input value={this.password} name="confirmNewPassword" id="confirmNewPassword" type="password"
                        placeholder="Confirm New Password" required/>
                      <label for="confirmNewPassword" class="has-text-left" style="font-size:0.8em">Confirm New Password</label>
                    </div>
                    {this.state.errorMessage && (
                      <div id="error" class="error-color">
                        <span>
                          {this.state.errorMessage}

                        </span>
                      </div>
                    )}
                    {this.state.successMessage && (
                      <div>
                        <span>{this.state.successMessage}

                        </span>
                      </div>
                    )}
                    <button disabled={!this.state.userID} type="submit" id="confirmButton" class="is-fullwidth">Submit</button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    );
  }
}
