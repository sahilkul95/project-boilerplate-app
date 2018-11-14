import { h, Component } from 'preact';
import CONSTANTS from '../../lib/constants';
import { route } from 'preact-router';
import { Link } from 'preact-router';
import http from 'fetch-bb';
// import { AppStore } from '../../lib/store';

let resetToken;

export default class ResetPassword extends Component {

  resetPassword(e) {
    e.preventDefault();
    this.setState({
      isResponseReceived:true,
      isButtonClicked: true
    });
    this.setState({newPassword: e.target.newPassword.value});
    this.setState({confirmPassword: e.target.confirmPassword.value});
    // if (this.state.newPassword !== this.state.confirmPassword) {
    //   this.setState({
    //     isResponseReceived:false,
    //     isButtonClicked: false
    //   });
    //   return this.setState({errorMessage: 'Passwords do not match'});
    // }
    return http
      .post(`${CONSTANTS.API_URL}/api/resetpassword?resetToken`, {
        newPassword: e.target.newPassword.value,
        confirmNewPassword: e.target.confirmPassword.value,
        resetToken: this.props.matches.resetToken
      })
      .then(() => {
        this.setState({successMessage: 'Your password has been reset. Proceed to '});
        this.setState({errorMessage: ''});
        this.setState({
          isResponseReceived:false,
          isButtonClicked: false
        });
      })
      .catch((HTTPException) => {
        if (HTTPException.statusCode === 409) {
          this.setState({
            isResponseReceived:false,
            isButtonClicked: false,
            shortName: ''
          });
          return this.setState({errorMessage: 'Passwords do not match', successMessage: ''});
        }
        else if (HTTPException.statusCode === 400) {
          this.setState({
            isResponseReceived:false,
            isButtonClicked: false,
            shortName: ''
          });
          return this.setState({errorMessage: 'Passwords must contain At least 6 characters,including UPPERCASE, lowercase letters, '+
           'special characters and Digits', successMessage: ''});
        }
        this.setState({
          isResponseReceived: false,
          isButtonClicked: false
          // shortName: AppStore.get('userinfo').company.shortName
        });
        return this.setState({errorMessage: 'This link is expired. Please ', successMessage: ''});
      });
  }
  componentWillMount() {
    this.state = {
      newPassword: '',
      confirmPassword: '',
      errorMessage: '',
      successMessage: '',
      shortName: '',
      isButtonClicked: false,
      isResponseReceived: false
    };
  }
  componentDidMount() {

    resetToken = this.props.matches.resetToken;
    if (!resetToken) {

      route(`/forgotpassword`);
    }
  }

  render () {
    return (
      <section class="row row-center has-text-center auth-section">
        <div class="col-xs-12 col-sm-6 col-md-5 col-lg-3 auth-center">
          <form name="resetpasswordform" onSubmit={this.resetPassword.bind(this)}>
            <div class="row">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <img src="/assets/static/PowerDECK_Logo.svg" />
                <sup>TM</sup>
              </div>
            </div>
            <div class="row box">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 auth-form">
                <label class="field">
                  <input autofocus type="password" placeholder="New Password" name="newPassword" id="newPassword"
                    disabled={this.state.isResponseReceived} required />
                  <label for="newPassword" class="has-text-left" style="font-size:0.8em">Enter New Password</label>
                </label>
                <label class="field">
                  <input autofocus type="password" placeholder="Confirm Password" name="confirmPassword" id="confirmPassword"
                    disabled={this.state.isResponseReceived} required />
                  <label for="confirmPassword" class="has-text-left" style="font-size:0.8em">Confirm Password</label>
                </label>
                {this.state.errorMessage && (
                  <div id="error" class="error-color">
                    <span>
                      {this.state.errorMessage}
                      {
                        this.state.errorMessage === 'This link is expired. Please ' &&
                        (<Link class="hyperlink" href={`/forgotpassword`}>generate a new one</Link>)
                      }
                    </span>
                  </div>
                )}
                {this.state.successMessage && (
                  <div>
                    <span>{this.state.successMessage}
                      <Link class="hyperlink" href={`/`}>Login Here</Link>
                    </span>
                  </div>
                )}
                <button type="submit" class="is-fullwidth" disabled={this.state.isButtonClicked}>Reset Password</button>
              </div>
            </div>
          </form>
        </div>
      </section>
    );
  }
}
