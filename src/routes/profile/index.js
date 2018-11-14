import { h, Component } from 'preact';
import { Link } from 'preact-router';
import CONSTANTS from '../../lib/constants';
import { AppStore } from '../../lib/store';
import { route } from 'preact-router';
import { Toast } from '../../lib/toastr';
import http from 'fetch-bb';
import { startLoader, stopLoader } from '../../lib/utils';

export default class Profile extends Component {
  getUserProfile() {
    startLoader();
    return http
      .get(`${CONSTANTS.API_URL}/api/user/me`)
      .then((profileInfo) => {
        this.setState({
          profile: profileInfo
        });
        stopLoader();
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
        stopLoader();
      });
  }

  logout() {
    http.post(`${CONSTANTS.API_URL}/api/user/logout`)
      .then(() => {
        AppStore.removeAll();
        AppStore.set('shortName', this.state.shortName);
        new Toast('Successfully logged out', Toast.TYPE_DONE, Toast.TIME_LONG);
        route(`/${this.state.shortName}/login`);
      })
      .catch((HTTPException) => {
        console.error(HTTPException);
      });
  }

  componentWillMount() {
    this.state = {
      profile: {},
      shortName: ''
    };
  }
  componentDidMount() {
    this.getUserProfile();
    let userInfo = AppStore.get('userinfo');
    this.setState({shortName: userInfo.company.shortName});
  }

  render({}, { profile }) {
    return (
      <div>
        <div class="box">
          <section>
            <div class="row">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12 table-responsive">
                Welcome, <h6>{profile.name}</h6>
                <table class="m-t-10 no-border-table">
                  <tbody>
                    <tr>
                      <td>E-Mail</td>
                      <td>{profile.email || 'Not Available'}</td>
                    </tr>
                    <tr>
                      <td>Phone</td>
                      <td>{profile.mobile || 'Not Available'}</td>
                    </tr>
                    <tr>
                      <td>Organization</td>
                      <td>{profile.company ? profile.company.name : 'Not Available'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="row m-t-10">
              <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                <Link class="button" href="/verifyOldPassword">Change Password</Link>
              </div>
            </div>
          </section>
        </div>
        <div class="box">
          <section class="row">
            <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
              <h6>Advance User Panel</h6>
              <span>
                Coming Soon...
              </span>
            </div>
          </section>
        </div>
      </div>
    );
  }
}
