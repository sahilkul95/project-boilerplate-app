import { h, Component } from 'preact';
import {route} from 'preact-router';
import CONSTANTS from '../../lib/constants';
import { Toast } from '../../lib/toastr';
import http from 'fetch-bb';

export default class verifyOldPassword extends Component {

  verifyOldPassword(e) {
    e.preventDefault();
    this.setState({
      oldPassword: e.target.oldPassword.value,
      isResponseReceived: true,
      isButtonClicked: true
    });

    return http
      .post(`${CONSTANTS.API_URL}/api/user/verifyOldPassword`,{
        oldPassword: e.target.oldPassword.value
      })
      .then(() => {
        this.setState({
          isResponseReceived:false,
          isButtonClicked: false
        });
        return route('/changePassword', true);
      })
      .catch((DBException) => {
        this.setState({
          isResponseReceived:false,
          isButtonClicked: false
        });
        new Toast(DBException.message, Toast.TYPE_ERROR, Toast.TIME_LONG);
        console.error(DBException);
      });
  }
  componentWillMount() {
    this.state = {
      oldPassword:'',
      isResponseReceived: false,
      isButtonClicked: false
    };
  }

  render () {
    return (
      <section class="row row-center has-text-center auth-section">
        <div class="column column-40 auth-center">
          <p class="has-text-left">To continue, first verify its you.</p>
          <br />
          <form class="box" onSubmit={this.verifyOldPassword.bind(this)}>
            <div class="row">
              <div class="column">
                <h6 class="inline">Change Password</h6>
              </div>
            </div>
            <div class="row">
              <div class="column auth-form">
                <div class="field">
                  <input value={this.state.oldPassword} name="oldPassword" id="oldPassword" type="password" placeholder="Enter your old password"
                    disabled={this.state.isResponseReceived} required/>
                  <label for="oldPassword" class="has-text-left" style="font-size:0.8em">Enter your old password</label>
                </div>
                <button class="is-fullwidth" type="submit" disabled={this.state.isButtonClicked}>Next</button>
              </div>
            </div>
          </form>
        </div>
      </section>
    );
  }
}
