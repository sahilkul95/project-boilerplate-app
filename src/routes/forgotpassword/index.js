import { h, Component } from 'preact';
import CONSTANTS from '../../lib/constants';
import http from 'fetch-bb';

export default class ForgotPassword extends Component {

  shouldComponentUpdate() {

  }

  send(e) {
    e.preventDefault();
    this.setState({
      email: e.target.email.value,
      isResponseReceived:true,
      errorMessage: '',
      successMessage: '',
      shortName: this.props.matches.shortName
    });
    http.post(`${CONSTANTS.API_URL}/api/forgotpassword`, {
      email: this.state.email,
      shortName: this.state.shortName
    })
      .then(() => {
        this.setState({successMessage: 'Please check your Inbox for further instructions'});
        this.setState({errorMessage: ''});
        this.state.isSendButtonDisabled = true;
        this.setState({
          isResponseReceived:false
        });
      })
      .catch(() => {
        this.setState({errorMessage: 'Registered user not found'});
        this.setState({successMessage: ''});
        this.setState({
          isResponseReceived:false
        });
        return false;
      });
  }

  componentWillMount() {
    this.state = {
      isSendButtonDisabled: false,
      email: '',
      errorMessage: '',
      successMessage: '',
      shortName: '',
      isResponseReceived: false
    };
    this.setState({
      shortName: this.props.matches.shortName
    });
  }

  componentDidMount() {
  }

  render () {
    return (
      <section class="row row-center has-text-center auth-section">
        <div class="col-xs-12 col-sm-6 col-md-5 col-lg-3 auth-center">
          <form name="forgotpasswordform" onSubmit={this.send.bind(this)}>
            <div class="row">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <img src="/assets/static/PowerDECK_Logo.svg" />
                <sup>TM</sup>
              </div>
            </div>
            <div class="row box">
              <div class="auth-form col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <div class="field">
                  <input autofocus value={this.state.email} id="email" type="email" placeholder="Email" maxlength="75" name="email"
                    disabled={this.state.isResponseReceived} required />
                  <label for="email" class="has-text-left" style="font-size:0.8em">Enter your Email</label>
                </div>
                <div id="error" class="error-color">{this.state.errorMessage}</div>
                <div id="error" class="success-color">{this.state.successMessage}</div>
                <button type="submit" disabled={this.state.isSendButtonDisabled} class="button-margin is-fullwidth">Send</button>
              </div>
            </div>
          </form>
        </div>
      </section>
    );
  }
}
