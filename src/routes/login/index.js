import { h, Component } from 'preact';
import { Link } from 'preact-router';

export default class Login extends Component {

  async login(e) {
    e.preventDefault();
  }

  render() {
    return (
      <section class="row row-center has-text-center auth-section">
        <div class="limiter">
          <div class="container-login100">
            <div class="wrap-login100">
              <form onSubmit={this.login.bind(this)} class="login100-form">
                <span class="login100-form-title p-b-26" style="padding-bottom:26px;">
                  Welcome
                </span>
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

                <div class="container-login100-form-btn">
                  <div class="wrap-login100-form-btn">
                    <div class="login100-form-bgbtn"/>
                    <button type="submit" id="loginButton" class="login100-form-btn"
                      disabled={this.state.isButtonClicked}>Login</button>
                  </div>
                </div>
                <div class="has-text-centered p-t-115" style="padding-top:20px;">
                  <span class="txt1">
                    <b> <Link class="hyperlink" href={`/forgotpassword`}>Forgot password?</Link> </b>
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }
}
