import { h, Component } from 'preact';
import {route} from 'preact-router';
import { Toast } from '../../lib/toastr';
import CONSTANTS from '../../lib/constants';
import { AppStore } from '../../lib/store';
import http from 'fetch-bb';

let changePasswordToken;

export default class changePassword extends Component {

  showHide(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      otype: this.state.otype === 'text' ? 'password' : 'text'
    });
  }

  showHideN(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      ntype: this.state.ntype === 'text' ? 'password' : 'text'
    });
  }

  changePassword(e) {
    e.preventDefault();
    this.setState({
      isResponseReceived:true,
      newpassword : e.target.newPass.value,
      confirmNewPassword : e.target.confirmPass.value,
      isButtonClicked: true,
      shortName: AppStore.get('userinfo').company.shortName
    });

    let newpassword = e.target.newPass.value;
    let confirmNewPassword = e.target.confirmPass.value;
    // if (newpassword !== confirmNewPassword){
    //   this.setState({
    //     isResponseReceived:false,
    //     isButtonClicked: false
    //   });
    //   new Toast('Passwords do not match', Toast.TYPE_ERROR, Toast.TIME_LONG);
    // }
    http.put(`${CONSTANTS.API_URL}/api/user/changepassword`,{
      newPassword: newpassword,
      confirmpassword: confirmNewPassword
    })
      .then(() => {
        new Toast('Password changed successfully, login again with new password', Toast.TYPE_DONE, Toast.TIME_LONG);
        this.setState({errorMessage: ''});
        this.logout();
      })
      .catch((HTTPException) => {
        if (HTTPException.statusCode === 409) {
          this.setState({
            isResponseReceived:false,
            isButtonClicked: false,
            shortName: ''
          });
          new Toast('Passwords do not match', Toast.TYPE_ERROR, Toast.TIME_LONG);
          return this.setState({errorMessage: 'Passwords do not match', successMessage: ''});
        }
        else if (HTTPException.statusCode === 400) {
          this.setState({
            isResponseReceived:false,
            isButtonClicked: false,
            shortName: ''
          });
          new Toast('Passwords must contain At least 6 characters, including UPPERCASE, lowercase letters, '+
           'special characters and Digits', Toast.TYPE_ERROR, Toast.TIME_LONG);
          return this.setState({errorMessage: 'Passwords must contain At least 6 characters, including UPPERCASE, lowercase letters, '+
             'special characters and Digits', successMessage: ''});
        }
        this.setState({
          isResponseReceived: false,
          isButtonClicked: false,
          shortName: AppStore.get('userinfo').company.shortName
        });
      });
  }

  logout() {
    http.post(`${CONSTANTS.API_URL}/api/user/logout`)
      .then(() => {
        AppStore.removeAll();
        new Toast('Successfully logged out', Toast.TYPE_DONE, Toast.TIME_LONG);
        route(`/${this.state.shortName}/login`);
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  componentWillMount() {
    this.state = {
      otype: 'password',
      ntype: 'password',
      score: 'null',
      shortName: '',
      isResponseReceived: false,
      isButtonClicked: false,
      newpassword : '',
      confirmNewPassword :'',
      errorMessage: '',
      successMessage: ''
    };
    let userinfo=AppStore.get('userinfo');
    this.setState({
      shortName: userinfo.company.shortName
    });
  }
  componentDidMount() {
    this.showHide = this.showHide.bind(this);
    this.showHideN = this.showHideN.bind(this);
    changePasswordToken = this.props.matches.changePasswordToken;
    if (!changePasswordToken) {
      route('/changePassword');
    }
  }

  render () {
    return (
      <section class="row row-center has-text-center auth-section verify-background">
        <div class="column column-25 auth-center">
          <form class="box" onSubmit={this.changePassword.bind(this)}>
            <div class="row">
              <div class="column">
                <h6 class="inline">Confirm Password</h6>
              </div>
            </div>
            <div class="row">
              <div class="column auth-form">
                <label class="row">
                  <input id="txtpassword" name="newPass"
                    type={this.state.otype} placeholder="Enter New Password" disabled={this.state.isResponseReceived}required/>
                  <span onClick={this.showHide}>{this.state.otype === 'text' ? 'Hide' : 'Show'}</span>
                </label>

                <label class="row">
                  <input id="confirmPass" name="confirmPass" type={this.state.ntype} placeholder="Confirm New Password"
                    disabled={this.state.isResponseReceived} required/>
                  <span onClick={this.showHideN}>{this.state.ntype === 'text' ? 'Hide' : 'Show'}</span>
                </label>
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
                <button type="submit" disabled={this.state.isButtonClicked} id="confirmButton" class="is-fullwidth">Submit</button>
              </div>
            </div>
          </form>
          <p>  Choose a strong password and do not reuse it for other accounts..</p>
        </div>
      </section>
    );
  }
}
